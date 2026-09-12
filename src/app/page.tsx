"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import PropertyForm from "@/components/PropertyForm";
import DiagnosisSummaryCard, { SaveComparisonPropertyResult } from "@/components/DiagnosisSummaryCard";
import SavedPropertiesModal from "@/components/SavedPropertiesModal";
import FpSection from "@/components/sections/FpSection";
import LegalSection from "@/components/sections/LegalSection";
import InspectionSection from "@/components/sections/InspectionSection";
import ValuationSection from "@/components/sections/ValuationSection";
import { LoanScenarioSummary } from "@/lib/calculations";
import { createDefaultProperty, Property, TabId } from "@/lib/types";
import {
  ComparisonSnapshot,
  MAX_SAVED_PROPERTIES,
  SavedComparisonProperty,
  createSavedComparisonProperty,
  loadSavedComparisonProperties,
  migrateLegacySavedProperties,
  persistSavedComparisonProperties,
} from "@/lib/propertyComparison";
import { deleteImagesForProperty } from "@/lib/imageStorage";
import {
  FpAdvisorFaceIcon,
  InspectorFaceIcon,
  LegalAdvisorFaceIcon,
  RealtorFaceIcon,
} from "@/components/icons/AdvisorCharacterImages";

const TABS: { id: TabId; label: string; Icon: typeof RealtorFaceIcon }[] = [
  { id: "valuation", label: "不動産プロ", Icon: RealtorFaceIcon },
  { id: "legal", label: "宅建士", Icon: LegalAdvisorFaceIcon },
  { id: "inspection", label: "住宅診断士", Icon: InspectorFaceIcon },
  { id: "fp", label: "FP", Icon: FpAdvisorFaceIcon },
];

// 「現在編集中の物件」と「保存済み物件一覧」はlocalStorage内で別キーに分けて管理する
const CURRENT_PROPERTY_STORAGE_KEY = "home-compass:property";

interface StoredDraft {
  property: Property;
  /** 現在読み込んで編集中の保存済み物件のID。新規（未保存）の場合はnull */
  currentPropertyId: string | null;
}

export default function Home() {
  const [property, setProperty] = useState<Property>(createDefaultProperty());
  // 「保存した物件」一覧から開いて編集中の物件のID。新規（未保存）の場合はnull
  const [currentSavedPropertyId, setCurrentSavedPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("fp");
  const [isHydrated, setIsHydrated] = useState(false);

  const [savedComparisonProperties, setSavedComparisonProperties] = useState<SavedComparisonProperty[]>([]);
  const [showSavedPropertiesModal, setShowSavedPropertiesModal] = useState(false);

  // 不動産プロのサポートタブの周辺相場は、診断サマリーカードでも使うためpage側で保持する
  const [marketPricePerTsuboManYen, setMarketPricePerTsuboManYen] = useState(0);
  const [isAutoFetchingMarketPrice, setIsAutoFetchingMarketPrice] = useState(false);
  // FPのサポートタブで判定した固定/変動金利シナリオの有利判定。診断サマリーカードにも反映するためpage側で保持する
  const [loanScenarioSummary, setLoanScenarioSummary] = useState<LoanScenarioSummary | null>(null);
  // 診断サマリーの項目クリックでタブ切り替え後にスクロールしたい要素のid（不要になったらnullに戻す）
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  // 直前に自動取得を試みた住所。同じ住所に対する再取得を防ぐ簡易キャッシュとして使う
  const lastAutoFetchedLocationRef = useRef<string | null>(null);

  // ページを開いた時（リロード時含む）、編集中データ・保存済み一覧をそれぞれ復元する
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CURRENT_PROPERTY_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          const parsedRecord = parsed as Record<string, unknown>;
          // localStorageの読み取りはクライアントでしか行えず、SSRとの初期HTML不一致を避けるため
          // マウント後のこの一度限りの復元はeffect内でのsetStateが正しい選択肢になる
          if (typeof parsedRecord.property === "object" && parsedRecord.property !== null) {
            // 現行形式：{ property, currentPropertyId }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setProperty({ ...createDefaultProperty(), ...parsedRecord.property });
            if (typeof parsedRecord.currentPropertyId === "string") {
              setCurrentSavedPropertyId(parsedRecord.currentPropertyId);
            }
          } else {
            // 旧形式（Propertyそのもの）との後方互換
            setProperty({ ...createDefaultProperty(), ...parsedRecord });
          }
        }
      }
    } catch {
      // 保存データが壊れている場合は既定値のまま利用する
    }

    // 旧「下書き切り替え」機能のデータが残っていれば、新しい「保存した物件」機能に1度だけ移行する
    migrateLegacySavedProperties();
    setSavedComparisonProperties(loadSavedComparisonProperties());
    setIsHydrated(true);
  }, []);

  // 編集中の内容が変わるたびに自動保存する（復元処理の完了後のみ）
  useEffect(() => {
    if (!isHydrated) return;
    const draft: StoredDraft = { property, currentPropertyId: currentSavedPropertyId };
    window.localStorage.setItem(CURRENT_PROPERTY_STORAGE_KEY, JSON.stringify(draft));
  }, [property, currentSavedPropertyId, isHydrated]);

  // 所在地の入力が止まってから800ms後に、周辺相場の坪単価を自動取得する。
  // 同じ住所に対しては（marketPricePerTsuboManYenが既に入っている限り）再取得しない簡易キャッシュ付き。
  useEffect(() => {
    if (!isHydrated) return;

    const trimmedLocation = property.location.trim();
    if (!trimmedLocation) return;
    if (trimmedLocation === lastAutoFetchedLocationRef.current && marketPricePerTsuboManYen > 0) return;

    const timer = setTimeout(async () => {
      // タイマー待機中に手動入力などで既に同じ住所分が反映されていれば、上書きしない
      if (trimmedLocation === lastAutoFetchedLocationRef.current) return;

      setIsAutoFetchingMarketPrice(true);
      try {
        const res = await fetch(`/api/land-price?location=${encodeURIComponent(trimmedLocation)}`);
        const data: { marketPricePerTsuboManYen?: number } = await res.json();
        if (res.ok && typeof data.marketPricePerTsuboManYen === "number") {
          setMarketPricePerTsuboManYen(Math.round(data.marketPricePerTsuboManYen * 10) / 10);
          lastAutoFetchedLocationRef.current = trimmedLocation;
        }
        // 失敗時はエラー表示せず、従来通り手入力できる状態のままにする
      } catch {
        // 失敗時も同様に握りつぶす
      } finally {
        setIsAutoFetchingMarketPrice(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [property.location, marketPricePerTsuboManYen, isHydrated]);

  // 手動入力・手動再取得（ValuationSection側）の場合も、現在の住所分は取得済み扱いにして
  // あとから自動取得タイマーが上書きしないようにする
  const handleMarketPriceChange = (value: number) => {
    lastAutoFetchedLocationRef.current = property.location.trim();
    setMarketPricePerTsuboManYen(value);
  };

  // 診断サマリーの項目クリック：タブを切り替えたうえで、該当セクションまでスクロールする
  const handleNavigateFromSummary = (tab: TabId, scrollTargetIdToUse: string) => {
    setActiveTab(tab);
    setScrollTargetId(scrollTargetIdToUse);
  };

  // タブ切り替え後のレンダリングが確定してから（requestAnimationFrameで1描画分待って）スクロールする
  useEffect(() => {
    if (!scrollTargetId) return;
    const targetId = scrollTargetId;
    const frame = requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setScrollTargetId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, scrollTargetId]);

  const handleReset = () => {
    if (!window.confirm("入力内容をリセットします。よろしいですか？")) return;
    window.localStorage.removeItem(CURRENT_PROPERTY_STORAGE_KEY);
    setProperty(createDefaultProperty());
    setCurrentSavedPropertyId(null);
    setMarketPricePerTsuboManYen(0);
  };

  // 診断サマリーカードの「この物件を保存する」から呼ばれる。
  // 「保存した物件」一覧から開いて編集中の物件があれば上書き、なければ新規保存する（上限チェック付き）
  const handleSaveComparisonProperty = (
    nickname: string,
    snapshot: ComparisonSnapshot,
  ): SaveComparisonPropertyResult => {
    if (currentSavedPropertyId) {
      const existingIndex = savedComparisonProperties.findIndex((saved) => saved.id === currentSavedPropertyId);
      if (existingIndex !== -1) {
        const next = savedComparisonProperties.map((saved, index) =>
          index === existingIndex
            ? { ...saved, nickname, property, snapshot, savedAt: new Date().toISOString() }
            : saved,
        );
        setSavedComparisonProperties(next);
        persistSavedComparisonProperties(next);
        return "saved";
      }
    }

    if (savedComparisonProperties.length >= MAX_SAVED_PROPERTIES) {
      return "limit-reached";
    }
    const saved = createSavedComparisonProperty(nickname, property, snapshot);
    const next = [...savedComparisonProperties, saved];
    setSavedComparisonProperties(next);
    persistSavedComparisonProperties(next);
    setCurrentSavedPropertyId(saved.id);
    return "saved";
  };

  // 保存した物件一覧の「開く」。保存時点のスナップショットにあった周辺相場もあわせて復元する
  const handleOpenComparisonProperty = (id: string) => {
    const saved = savedComparisonProperties.find((s) => s.id === id);
    if (!saved) return;
    setProperty({ ...createDefaultProperty(), ...saved.property });
    setCurrentSavedPropertyId(saved.id);
    setMarketPricePerTsuboManYen(saved.snapshot.marketPricePerTsuboManYen);
    lastAutoFetchedLocationRef.current = saved.property.location.trim();
    setShowSavedPropertiesModal(false);
  };

  const handleDeleteComparisonProperty = (id: string) => {
    const next = savedComparisonProperties.filter((saved) => saved.id !== id);
    setSavedComparisonProperties(next);
    persistSavedComparisonProperties(next);
    // 物件に紐づく画像メモ（IndexedDB）も合わせて削除する。失敗しても物件一覧の削除自体は継続する
    deleteImagesForProperty(id).catch(() => {});

    if (currentSavedPropertyId === id) {
      setProperty(createDefaultProperty());
      setCurrentSavedPropertyId(null);
      setMarketPricePerTsuboManYen(0);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background font-sans text-ink">
      <Header
        actions={
          <button
            type="button"
            onClick={() => setShowSavedPropertiesModal(true)}
            className="min-h-11 touch-manipulation rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink/75 shadow-sm active:bg-ink/5"
          >
            保存した物件
            {savedComparisonProperties.length > 0 && (
              <span className="ml-1.5 text-ink/45">({savedComparisonProperties.length})</span>
            )}
          </button>
        }
      />
      <main className="w-full max-w-3xl px-6 py-10">
        <h1 className="font-heading text-2xl text-ink">物件情報</h1>

        {currentSavedPropertyId && (
          <p className="mt-4 text-sm text-ink/55">
            「保存した物件」から編集中です。「この物件を保存する」で上書き保存できます。
          </p>
        )}

        <div className="mt-6">
          <PropertyForm value={property} onChange={setProperty} />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-11 touch-manipulation rounded-md border border-ink/20 px-3 py-2.5 text-sm font-medium text-ink/60 active:bg-ink/5"
          >
            入力内容をリセット
          </button>
        </div>

        <DiagnosisSummaryCard
          property={property}
          marketPricePerTsuboManYen={marketPricePerTsuboManYen}
          onSaveComparisonProperty={handleSaveComparisonProperty}
          currentNickname={savedComparisonProperties.find((s) => s.id === currentSavedPropertyId)?.nickname}
          onNavigateToTab={handleNavigateFromSummary}
          loanScenarioSummary={loanScenarioSummary}
        />

        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-ink/10" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 shrink-0 touch-manipulation flex-col items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? "border-accent text-ink" : "border-transparent text-ink/45 active:text-ink/70"
              }`}
            >
              <tab.Icon className={`h-8 w-8 ${activeTab === tab.id ? "" : "opacity-60"}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "valuation" && (
          <ValuationSection
            property={property}
            marketPricePerTsuboManYen={marketPricePerTsuboManYen}
            onMarketPricePerTsuboManYenChange={handleMarketPriceChange}
            isAutoFetchingMarketPrice={isAutoFetchingMarketPrice}
          />
        )}
        {activeTab === "legal" && <LegalSection property={property} />}
        {activeTab === "inspection" && <InspectionSection property={property} />}
        {activeTab === "fp" && (
          <FpSection property={property} onChange={setProperty} onScenarioSummaryChange={setLoanScenarioSummary} />
        )}
      </main>

      {showSavedPropertiesModal && (
        <SavedPropertiesModal
          properties={savedComparisonProperties}
          onOpenProperty={handleOpenComparisonProperty}
          onDeleteProperty={handleDeleteComparisonProperty}
          onClose={() => setShowSavedPropertiesModal(false)}
        />
      )}
    </div>
  );
}
