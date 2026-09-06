import Image from "next/image";

interface CharacterImageProps {
  className?: string;
}

// Next.jsの画像最適化（sharpによるPNG→WebP/AVIF変換）が、このキャラクターPNGの透過部分を
// 黒背景に塗りつぶしてしまう現象を確認したため、キャラクター画像はすべてunoptimizedにして
// 元のPNGバイト列（透過を検証済み）をそのまま配信する。

/** 不動産屋：柴犬キャラクター */
export function RealtorCharacterImage({ className }: CharacterImageProps) {
  return (
    <Image
      src="/characters/realtor-dog.png"
      alt="不動産屋の柴犬キャラクター"
      width={512}
      height={512}
      unoptimized
      className={className}
    />
  );
}

/** 宅建士：フクロウキャラクター */
export function LegalAdvisorCharacterImage({ className }: CharacterImageProps) {
  return (
    <Image
      src="/characters/legal-owl.png"
      alt="宅建士のフクロウキャラクター"
      width={512}
      height={512}
      unoptimized
      className={className}
    />
  );
}

/** 住宅診断士：モグラキャラクター */
export function InspectorCharacterImage({ className }: CharacterImageProps) {
  return (
    <Image
      src="/characters/inspector-mole.png"
      alt="住宅診断士のモグラキャラクター"
      width={512}
      height={512}
      unoptimized
      className={className}
    />
  );
}

/** FP：リスキャラクター */
export function FpAdvisorCharacterImage({ className }: CharacterImageProps) {
  return (
    <Image
      src="/characters/fp-squirrel.png"
      alt="FPのリスキャラクター"
      width={512}
      height={512}
      unoptimized
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// タブバー用：顔だけを丸く切り出した小サイズアイコン
// ---------------------------------------------------------------------------

function CharacterFaceIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <span className={`inline-block overflow-hidden rounded-full ${className ?? ""}`}>
      <Image src={src} alt={alt} width={512} height={512} unoptimized className="h-full w-full object-cover" />
    </span>
  );
}

/** 不動産屋タブ用：柴犬の顔アイコン */
export function RealtorFaceIcon({ className }: CharacterImageProps) {
  return <CharacterFaceIcon src="/characters/tab-icons/realtor-dog-face.png" alt="不動産屋" className={className} />;
}

/** 宅建士タブ用：フクロウの顔アイコン */
export function LegalAdvisorFaceIcon({ className }: CharacterImageProps) {
  return <CharacterFaceIcon src="/characters/tab-icons/legal-owl-face.png" alt="宅建士" className={className} />;
}

/** 住宅診断士タブ用：モグラの顔アイコン */
export function InspectorFaceIcon({ className }: CharacterImageProps) {
  return (
    <CharacterFaceIcon src="/characters/tab-icons/inspector-mole-face.png" alt="住宅診断士" className={className} />
  );
}

/** FPタブ用：リスの顔アイコン */
export function FpAdvisorFaceIcon({ className }: CharacterImageProps) {
  return <CharacterFaceIcon src="/characters/tab-icons/fp-squirrel-face.png" alt="FP" className={className} />;
}
