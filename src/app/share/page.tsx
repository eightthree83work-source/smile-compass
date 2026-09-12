import type { Metadata } from "next";
import Link from "next/link";
import { HazardFlag, ShareSummary, decodeShareSummary } from "@/lib/shareSummary";
import { VALUATION_JUDGMENT_LABELS } from "@/lib/valuation";

interface SharePageProps {
  searchParams: Promise<{ d?: string }>;
}

const SITE_TITLE = "smile compass";
const FALLBACK_TITLE = "smile compass ― 物件のカルテ";
const FALLBACK_DESCRIPTION =
  "住まい探しに、笑顔のコンパスを。不動産プロ・宅建士・住宅診断士・FPの4つの視点でセルフ診断できるアプリです。";

const HAZARD_STATUS_TEXT: Record<HazardFlag, string> = { yes: "該当あり", no: "該当なし", unknown: "未確認" };

function buildDescription(summary: ShareSummary): string {
  const parts: string[] = [];
  if (summary.judgment) parts.push(`坪単価判定：${VALUATION_JUDGMENT_LABELS[summary.judgment]}`);
  parts.push(`要確認項目：${summary.legalCount + summary.inspectionCount}件`);
  parts.push(
    `ハザード（洪水${HAZARD_STATUS_TEXT[summary.hazardFlood]}／土砂${HAZARD_STATUS_TEXT[summary.hazardSediment]}／津波${HAZARD_STATUS_TEXT[summary.hazardTsunami]}）`,
  );
  parts.push("4人の専門家によるセルフ診断アプリ smile compass の結果です。");
  return parts.join("　");
}

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const { d } = await searchParams;
  const summary = d ? decodeShareSummary(d) : null;

  if (!summary) {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  }

  const title = `${summary.loc}の物件のカルテ | ${SITE_TITLE}`;
  const description = buildDescription(summary);
  const imageUrl = `/api/share-image?d=${encodeURIComponent(d as string)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ja_JP",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ searchParams }: SharePageProps) {
  const { d } = await searchParams;
  const summary = d ? decodeShareSummary(d) : null;
  const imageUrl = summary ? `/api/share-image?d=${encodeURIComponent(d as string)}` : "/api/share-image";

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-10 font-sans text-ink">
      <main className="w-full max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- OGP画像そのものをプレビュー表示するため素のimgを使う */}
        <img
          src={imageUrl}
          alt={summary ? `${summary.loc}の物件のカルテ` : SITE_TITLE}
          width={1200}
          height={630}
          className="w-full rounded-xl border border-ink/15 shadow-sm"
        />

        <div className="mt-8 text-center">
          {summary ? (
            <>
              <h1 className="font-heading text-2xl text-ink">{summary.loc}の物件のカルテ</h1>
              <p className="mt-2 text-sm text-ink/60">
                不動産プロ・宅建士・住宅診断士・FPの4つの視点で診断した結果です。金額などの詳しい内容は、ご自身の物件で無料診断して確認できます。
              </p>
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl text-ink">このシェアリンクは無効です</h1>
              <p className="mt-2 text-sm text-ink/60">リンクが壊れているか、期限切れの可能性があります。</p>
            </>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex min-h-12 touch-manipulation items-center justify-center rounded-full bg-accent px-8 py-3 text-base font-bold text-white shadow-sm active:opacity-80"
          >
            自分の物件も無料で診断してみる
          </Link>
        </div>
      </main>
    </div>
  );
}
