"use client";

import { useState } from "react";
import CurrencyInput from "@/components/CurrencyInput";
import { INPUT_CLASS_NAME } from "@/components/PropertyForm";
import { RealtorCharacterImage } from "@/components/icons/AdvisorCharacterImages";
import { getRealtorChecklist } from "@/lib/realtorChecklist";
import { Property } from "@/lib/types";
import {
  VALUATION_JUDGMENT_LABELS,
  calculatePricePerTsuboManYen,
  estimateBuildingPrice,
  judgeValuation,
} from "@/lib/valuation";

interface ValuationSectionProps {
  property: Property;
  marketPricePerTsuboManYen: number;
  onMarketPricePerTsuboManYenChange: (value: number) => void;
  /** 所在地入力に基づく自動取得（page.tsx側）が進行中かどうか */
  isAutoFetchingMarketPrice?: boolean;
}

interface LandPriceApiResponse {
  prefecture?: string;
  city?: string;
  marketPricePerTsuboManYen?: number;
  sampleSize?: number;
  error?: string;
}

interface AutoFetchResult {
  prefecture: string;
  city: string;
  sampleSize: number;
}

const manYenFormatter = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });

function formatManYen(value: number): string {
  return `${manYenFormatter.format(value)}万円`;
}

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

const JUDGMENT_STYLES: Record<string, string> = {
  undervalued: "border-[#0ca30c]/30 bg-[#0ca30c]/5 text-[#0b6b0b]",
  reasonable: "border-ink/15 bg-ink/5 text-ink/70",
  overvalued: "border-[#d03b3b]/30 bg-[#d03b3b]/5 text-[#a12f2f]",
};

const FETCH_FAILED_MESSAGE = "周辺相場の取得に失敗しました。手入力に切り替えてください。";

export default function ValuationSection({
  property,
  marketPricePerTsuboManYen,
  onMarketPricePerTsuboManYenChange,
  isAutoFetchingMarketPrice = false,
}: ValuationSectionProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchResult, setFetchResult] = useState<AutoFetchResult | null>(null);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const pricePerTsubo = calculatePricePerTsuboManYen(property);
  const result =
    pricePerTsubo !== null && marketPricePerTsuboManYen > 0
      ? judgeValuation(pricePerTsubo, marketPricePerTsuboManYen)
      : null;

  const checklist = getRealtorChecklist(property);
  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const buildingPriceEstimate = estimateBuildingPrice(property, marketPricePerTsuboManYen);

  const trimmedLocation = property.location.trim();

  const handleAutoFetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    setFetchResult(null);

    try {
      const res = await fetch(`/api/land-price?location=${encodeURIComponent(trimmedLocation)}`);
      const data = (await res.json()) as LandPriceApiResponse;

      if (!res.ok || data.marketPricePerTsuboManYen === undefined) {
        setFetchError(data.error ?? FETCH_FAILED_MESSAGE);
        return;
      }

      onMarketPricePerTsuboManYenChange(Math.round(data.marketPricePerTsuboManYen * 10) / 10);
      setFetchResult({
        prefecture: data.prefecture ?? "",
        city: data.city ?? "",
        sampleSize: data.sampleSize ?? 0,
      });
    } catch {
      setFetchError(FETCH_FAILED_MESSAGE);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <RealtorCharacterImage className="h-14 w-14 shrink-0" />
        <h2 className="font-heading text-xl text-ink">不動産プロのサポート</h2>
      </div>

      <p className="rounded-md border border-ink/15 bg-ink/5 p-3 text-sm text-ink/65">
        周辺相場は所在地の入力に応じて自動取得されます（国土交通省 不動産情報ライブラリの公開データに基づく概算）。SUUMO・不動産情報ライブラリで実際の周辺相場もあわせてご確認のうえ、必要であれば手入力で上書きしてください。「周辺相場を自動取得」ボタンは、住所変更後にもう一度取得し直したい場合にお使いください。
      </p>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm text-ink/55">坪単価（自動計算）</div>
            <div className="mt-1 font-heading text-2xl text-ink">
              {pricePerTsubo !== null ? formatManYen(pricePerTsubo) : "延床面積を入力してください"}
            </div>
          </div>

          <div>
            <label htmlFor="marketPricePerTsubo" className="block text-sm font-medium text-ink/80">
              周辺相場の坪単価（万円）
            </label>
            <CurrencyInput
              id="marketPricePerTsubo"
              className={INPUT_CLASS_NAME}
              value={marketPricePerTsuboManYen === 0 ? undefined : marketPricePerTsuboManYen}
              onChange={(next) => {
                onMarketPricePerTsuboManYenChange(next ?? 0);
                setFetchResult(null);
              }}
            />
            {isAutoFetchingMarketPrice && (
              <p className="mt-1 text-xs text-ink/45">所在地から周辺相場を自動取得中...</p>
            )}

            <button
              type="button"
              onClick={handleAutoFetch}
              disabled={isFetching || !trimmedLocation}
              title={trimmedLocation ? undefined : "所在地を入力すると利用できます"}
              className="mt-2 min-h-11 touch-manipulation rounded-md border border-ink/20 bg-white px-3 py-2.5 text-sm font-medium text-ink/75 active:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetching ? "取得中..." : "周辺相場を自動取得"}
            </button>

            {!trimmedLocation && <p className="mt-2 text-sm text-ink/55">所在地を入力すると自動取得できます</p>}
            {fetchResult && (
              <p className="mt-2 text-sm text-ink/55">
                {fetchResult.prefecture}
                {fetchResult.city}の戸建て取引{fetchResult.sampleSize}件から概算しました（不動産情報ライブラリ）
              </p>
            )}
            {fetchError && <p className="mt-2 text-sm text-[#a12f2f]">{fetchError}</p>}
          </div>
        </div>

        {result && (
          <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${JUDGMENT_STYLES[result.judgment]}`}>
            <span className="font-medium">{VALUATION_JUDGMENT_LABELS[result.judgment]}</span>
            <span className="ml-2">
              （周辺相場との乖離：{result.diffPercent > 0 ? "+" : ""}
              {result.diffPercent.toFixed(1)}%）
            </span>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">建物価格の目安を試算</h3>
        <p className="mt-1 text-sm text-ink/55">
          物件価格・敷地面積（坪）・周辺相場の坪単価から、土地値を除いた「試算上の建物価格」の目安を計算します。
        </p>
        <div className="mt-2 rounded-lg border border-ink/15 bg-white p-4">
          {buildingPriceEstimate ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-ink/55">敷地の試算価格</div>
                  <div className="mt-1 font-heading text-xl text-ink">
                    {formatYen(buildingPriceEstimate.estimatedLandPriceYen)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-ink/55">試算上の建物価格</div>
                  <div className="mt-1 font-heading text-xl text-ink">
                    {formatYen(buildingPriceEstimate.estimatedBuildingPriceYen)}
                  </div>
                </div>
              </div>
              <div
                className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                  buildingPriceEstimate.looksUndervalued
                    ? "border-[#0ca30c]/30 bg-[#0ca30c]/5 text-[#0b6b0b]"
                    : "border-ink/15 bg-ink/5 text-ink/70"
                }`}
              >
                {buildingPriceEstimate.looksUndervalued
                  ? "試算上の建物価格がプラスで大きめです。リフォーム済みで状態が良ければ割安感があります。"
                  : "試算上の建物価格はマイナス、または小さめです。追加のリフォーム費用がかかる可能性があるため、価格交渉や他物件との比較を検討しましょう。"}
                　あくまで簡易的な目安であり、断定的な診断ではありません。
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/55">
              物件価格・敷地面積（坪）・周辺相場の坪単価をすべて入力すると試算されます。
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-heading text-lg text-ink">内覧・購入検討チェックリスト</h3>
          <p className="mt-1 text-sm text-ink/55">
            不動産のプロ目線で確認しておきたいポイントです。断定的な診断ではなく、内覧・商談時の確認漏れを防ぐための目安としてご利用ください。
          </p>
        </div>

        {checklist.map((category) => (
          <div key={category.id}>
            <h4 className="font-heading text-base text-ink">{category.title}</h4>
            <ul className="mt-2 space-y-3">
              {category.items.map((item) => (
                <li key={item.id} className="rounded-lg border border-ink/15 bg-white p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent"
                      checked={Boolean(checkedIds[item.id])}
                      onChange={() => toggleChecked(item.id)}
                    />
                    <span>
                      <span className="block font-medium text-ink">{item.title}</span>
                      <span className="mt-0.5 block text-sm text-ink/55">{item.description}</span>
                      {item.note && <span className="mt-1 block text-sm text-ink/70">{item.note}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
