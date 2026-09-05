import "server-only";
import { SQM_PER_TSUBO } from "@/lib/valuation";

// このファイルはサーバー専用（APIキーを扱うため）。
// クライアントコンポーネントから絶対にインポートしないこと。

const REINFOLIB_BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
const API_REQUEST_TIMEOUT_MS = 8000;

/** 中古戸建て（土地+建物）に相当する取引種類 */
const HOUSE_TRANSACTION_TYPE = "宅地(土地と建物)";

/** 都道府県名とJIS都道府県コード（2桁）の対応表 */
const PREFECTURES: { code: string; name: string }[] = [
  { code: "01", name: "北海道" },
  { code: "02", name: "青森県" },
  { code: "03", name: "岩手県" },
  { code: "04", name: "宮城県" },
  { code: "05", name: "秋田県" },
  { code: "06", name: "山形県" },
  { code: "07", name: "福島県" },
  { code: "08", name: "茨城県" },
  { code: "09", name: "栃木県" },
  { code: "10", name: "群馬県" },
  { code: "11", name: "埼玉県" },
  { code: "12", name: "千葉県" },
  { code: "13", name: "東京都" },
  { code: "14", name: "神奈川県" },
  { code: "15", name: "新潟県" },
  { code: "16", name: "富山県" },
  { code: "17", name: "石川県" },
  { code: "18", name: "福井県" },
  { code: "19", name: "山梨県" },
  { code: "20", name: "長野県" },
  { code: "21", name: "岐阜県" },
  { code: "22", name: "静岡県" },
  { code: "23", name: "愛知県" },
  { code: "24", name: "三重県" },
  { code: "25", name: "滋賀県" },
  { code: "26", name: "京都府" },
  { code: "27", name: "大阪府" },
  { code: "28", name: "兵庫県" },
  { code: "29", name: "奈良県" },
  { code: "30", name: "和歌山県" },
  { code: "31", name: "鳥取県" },
  { code: "32", name: "島根県" },
  { code: "33", name: "岡山県" },
  { code: "34", name: "広島県" },
  { code: "35", name: "山口県" },
  { code: "36", name: "徳島県" },
  { code: "37", name: "香川県" },
  { code: "38", name: "愛媛県" },
  { code: "39", name: "高知県" },
  { code: "40", name: "福岡県" },
  { code: "41", name: "佐賀県" },
  { code: "42", name: "長崎県" },
  { code: "43", name: "熊本県" },
  { code: "44", name: "大分県" },
  { code: "45", name: "宮崎県" },
  { code: "46", name: "鹿児島県" },
  { code: "47", name: "沖縄県" },
];

interface MunicipalityListItem {
  id: string;
  name: string;
}

interface TransactionPriceRecord {
  Type?: string;
  /** 取引価格（総額、円）。文字列で返る */
  TradePrice?: string;
  /** 延床面積（㎡、建物用）。文字列で返る。「宅地(土地と建物)」ではPricePerUnitが空のため、これとTradePriceから坪単価を算出する */
  TotalFloorArea?: string;
}

// 不動産情報ライブラリAPIのレスポンスは配列そのものではなく、
// { "status": "OK", "data": [...] } という封筒構造で返る
interface ReinfolibEnvelope<T> {
  status?: string;
  data?: T;
}

export interface LocationCode {
  code: string;
  name: string;
}

export interface MarketPriceEstimate {
  /** 戸建て取引の平均坪単価（万円） */
  averagePricePerTsuboManYen: number;
  sampleSize: number;
  years: number[];
}

function fetchWithTimeout(url: string, apiKey: string): Promise<Response> {
  return fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  });
}

/** 所在地の自由入力文字列から都道府県を推定する */
export function findPrefecture(location: string): LocationCode | null {
  return PREFECTURES.find((pref) => location.includes(pref.name)) ?? null;
}

/**
 * 都道府県内の市区町村一覧（XIT002）を取得し、所在地の文字列に含まれる市区町村を推定する。
 * 複数マッチする場合は、より具体的な（名称が長い）ものを採用する。
 */
export async function resolveCityCode(
  location: string,
  prefectureCode: string,
  apiKey: string,
): Promise<LocationCode | null> {
  const res = await fetchWithTimeout(`${REINFOLIB_BASE_URL}/XIT002?area=${prefectureCode}`, apiKey);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`市区町村一覧の取得に失敗しました（status: ${res.status}, body: ${body.slice(0, 500)}）`);
  }

  const envelope = (await res.json()) as ReinfolibEnvelope<MunicipalityListItem[]>;
  const municipalities = envelope.data ?? [];
  const matches = municipalities.filter((m) => location.includes(m.name));
  if (matches.length === 0) return null;

  const best = matches.reduce((longest, current) => (current.name.length > longest.name.length ? current : longest));
  return { code: best.id, name: best.name };
}

async function fetchTransactionPrices(
  prefectureCode: string,
  cityCode: string,
  year: number,
  apiKey: string,
): Promise<TransactionPriceRecord[]> {
  const url = `${REINFOLIB_BASE_URL}/XIT001?year=${year}&area=${prefectureCode}&city=${cityCode}`;
  const res = await fetchWithTimeout(url, apiKey);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`取引価格情報の取得に失敗しました（status: ${res.status}, body: ${body.slice(0, 500)}）`);
  }

  const envelope = (await res.json()) as ReinfolibEnvelope<TransactionPriceRecord[]>;
  return Array.isArray(envelope.data) ? envelope.data : [];
}

/**
 * 不動産価格（取引価格・成約価格）情報取得API（XIT001）から、
 * 戸建て（宅地(土地と建物)）取引の平均坪単価（万円）を、直近2年分のデータから概算する。
 *
 * 「宅地(土地と建物)」種別ではAPIのPricePerUnit（坪単価）・UnitPrice（㎡単価）が空で返るため、
 * TradePrice（取引総額）とTotalFloorArea（延床面積）から坪単価を自前で算出する。
 */
export async function estimateHouseMarketPricePerTsubo(
  prefectureCode: string,
  cityCode: string,
  apiKey: string,
  currentYear: number = new Date().getFullYear(),
): Promise<MarketPriceEstimate | null> {
  const years = [currentYear - 1, currentYear - 2];
  const results = await Promise.all(
    years.map((year) => fetchTransactionPrices(prefectureCode, cityCode, year, apiKey)),
  );

  const pricesPerTsuboYen = results
    .flat()
    .filter((record) => record.Type === HOUSE_TRANSACTION_TYPE)
    .map((record) => {
      const tradePrice = Number(record.TradePrice);
      const totalFloorArea = Number(record.TotalFloorArea);
      if (!Number.isFinite(tradePrice) || tradePrice <= 0) return null;
      if (!Number.isFinite(totalFloorArea) || totalFloorArea <= 0) return null;
      return (tradePrice * SQM_PER_TSUBO) / totalFloorArea;
    })
    .filter((price): price is number => price !== null);

  if (pricesPerTsuboYen.length === 0) return null;

  const averageYen = pricesPerTsuboYen.reduce((sum, price) => sum + price, 0) / pricesPerTsuboYen.length;

  return {
    averagePricePerTsuboManYen: averageYen / 10000,
    sampleSize: pricesPerTsuboYen.length,
    years,
  };
}
