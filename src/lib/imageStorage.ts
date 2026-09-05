import { generateId } from "./id";

// 画像はlocalStorageではなくIndexedDBに保存する（localStorageは容量が小さく画像保存に不向きなため）。
// SavedPropertyとの紐付けはsavedPropertyId（SavedProperty.id）で行う。

const DB_NAME = "home-compass-images";
const DB_VERSION = 1;
const STORE_NAME = "propertyImages";
const INDEX_NAME = "savedPropertyId";

/** このサイズを超える画像は、保存前に自動でリサイズ・圧縮する */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
/** 圧縮後の最大辺（px） */
const RESIZE_MAX_DIMENSION = 1600;
const RESIZE_JPEG_QUALITY = 0.8;

export interface PropertyImage {
  id: string;
  savedPropertyId: string;
  blob: Blob;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("このブラウザではIndexedDBが利用できません"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex(INDEX_NAME, INDEX_NAME, { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDBを開けませんでした"));
  });
}

/** 5MBを超える画像は、保存前に自動でリサイズ・圧縮する。圧縮に失敗した場合は元ファイルのまま返す */
async function compressImageIfNeeded(file: File): Promise<Blob> {
  if (file.size <= MAX_FILE_SIZE_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, RESIZE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", RESIZE_JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function addPropertyImage(savedPropertyId: string, file: File): Promise<PropertyImage> {
  const blob = await compressImageIfNeeded(file);
  const image: PropertyImage = {
    id: generateId(),
    savedPropertyId,
    blob,
    createdAt: new Date().toISOString(),
  };

  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add(image);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("画像の保存に失敗しました"));
    });
  } finally {
    db.close();
  }

  return image;
}

export async function getPropertyImages(savedPropertyId: string): Promise<PropertyImage[]> {
  const db = await openDb();
  try {
    return await new Promise<PropertyImage[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).index(INDEX_NAME).getAll(savedPropertyId);
      request.onsuccess = () => resolve(request.result as PropertyImage[]);
      request.onerror = () => reject(request.error ?? new Error("画像の取得に失敗しました"));
    });
  } finally {
    db.close();
  }
}

export async function deletePropertyImage(imageId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(imageId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("画像の削除に失敗しました"));
    });
  } finally {
    db.close();
  }
}

/** 保存済み物件そのものを削除する際に、紐づく画像も合わせて削除する */
export async function deleteImagesForProperty(savedPropertyId: string): Promise<void> {
  const images = await getPropertyImages(savedPropertyId);
  if (images.length === 0) return;

  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      images.forEach((image) => store.delete(image.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("画像の削除に失敗しました"));
    });
  } finally {
    db.close();
  }
}
