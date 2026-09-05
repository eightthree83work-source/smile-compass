"use client";

import { useEffect, useRef, useState } from "react";
import { addPropertyImage, deletePropertyImage, getPropertyImages } from "@/lib/imageStorage";

interface PropertyImageGalleryProps {
  savedPropertyId: string;
}

interface DisplayImage {
  id: string;
  url: string;
}

const ERROR_LOAD = "画像の読み込みに失敗しました";
const ERROR_SAVE = "画像の保存に失敗しました。他の機能はそのままご利用いただけます。";
const ERROR_DELETE = "画像の削除に失敗しました";

export default function PropertyImageGallery({ savedPropertyId }: PropertyImageGalleryProps) {
  const [images, setImages] = useState<DisplayImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<DisplayImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<DisplayImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // アンマウント時に、その時点で保持している全てのobject URLを解放する
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getPropertyImages(savedPropertyId)
      .then((loaded) => {
        if (cancelled) return;
        setImages(loaded.map((image) => ({ id: image.id, url: URL.createObjectURL(image.blob) })));
      })
      .catch(() => {
        if (!cancelled) setError(ERROR_LOAD);
      });

    return () => {
      cancelled = true;
    };
  }, [savedPropertyId]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setIsSaving(true);
    setError(null);
    try {
      const added: DisplayImage[] = [];
      for (const file of files) {
        const image = await addPropertyImage(savedPropertyId, file);
        added.push({ id: image.id, url: URL.createObjectURL(image.blob) });
      }
      setImages((prev) => [...prev, ...added]);
    } catch {
      setError(ERROR_SAVE);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await deletePropertyImage(imageId);
      setImages((prev) => {
        const target = prev.find((image) => image.id === imageId);
        if (target) URL.revokeObjectURL(target.url);
        return prev.filter((image) => image.id !== imageId);
      });
      setPreviewImage((prev) => (prev?.id === imageId ? null : prev));
    } catch {
      setError(ERROR_DELETE);
    }
  };

  return (
    <div className="mt-3 border-t border-ink/10 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink/50">画像メモ</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSaving}
          className="min-h-11 touch-manipulation rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink/75 active:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "画像を追加"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {error && <p className="mt-2 text-sm text-[#a12f2f]">{error}</p>}

      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((image) => (
            <div key={image.id} className="relative aspect-square">
              <button
                type="button"
                onClick={() => setPreviewImage(image)}
                className="h-full w-full touch-manipulation overflow-hidden rounded-md border border-ink/15"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="物件の画像メモ" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                aria-label="この画像を削除"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 touch-manipulation items-center justify-center rounded-full border border-ink/20 bg-white text-xs text-ink/60 active:bg-ink/5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage.url}
            alt="物件の画像メモ（拡大）"
            className="max-h-full max-w-full rounded-md object-contain"
          />
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            aria-label="閉じる"
            className="absolute right-4 top-4 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-white/90 text-lg text-ink"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
