import { Property } from "./types";

export interface RealtorChecklistItem {
  id: string;
  /** チェック項目名 */
  title: string;
  /** 何を確認するか（具体的な確認方法） */
  description: string;
  /** 物件データに基づく補足（該当する項目のみ） */
  note?: string;
}

export interface RealtorChecklistCategory {
  id: string;
  /** カテゴリ名 */
  title: string;
  items: RealtorChecklistItem[];
}

/** 価格がこなれてくるとされる築年数の目安レンジ（下限・上限） */
const PRICE_SWEET_SPOT_MIN_AGE_YEARS = 20;
const PRICE_SWEET_SPOT_MAX_AGE_YEARS = 25;

/** 不動産のプロ目線で、内覧・購入検討時に確認したいチェックリスト（ルールベース） */
export function getRealtorChecklist(property: Property): RealtorChecklistCategory[] {
  const { buildingAgeYears } = property;
  const isInPriceSweetSpot =
    buildingAgeYears >= PRICE_SWEET_SPOT_MIN_AGE_YEARS && buildingAgeYears <= PRICE_SWEET_SPOT_MAX_AGE_YEARS;

  return [
    {
      id: "indoor",
      title: "屋内のチェックリスト",
      items: [
        {
          id: "layoutFlexibility",
          title: "間取り・構造の柔軟性",
          description:
            "壁を撤去して広いリビングにできる構造（軸組工法など）か。家族構成の変化に合わせた部屋数の変更が可能か",
        },
      ],
    },
    {
      id: "outdoor",
      title: "屋外のチェックリスト",
      items: [
        {
          id: "boundaryMarkers",
          title: "境界の明示と境界プレートの有無",
          description:
            "敷地の四隅に境界プレート（十字や矢印のついたマーク）が設置されているか。ブロック塀やフェンスがある場合、その中心・内・外どちらに境界があるか（所有権の範囲）を確認する",
        },
        {
          id: "parkingSpace",
          title: "駐車スペース",
          description:
            "駐車可能台数や車種によるサイズ制限の有無を確認する。前面道路の幅や車の出し入れのしやすさも確認する",
        },
      ],
    },
    {
      id: "other",
      title: "その他のチェックリスト",
      items: [
        {
          id: "ageAndMaintenanceHistory",
          title: "築年数とメンテナンス履歴の整合性",
          description:
            "築20〜25年前後の物件は価格がこなれていて狙い目。ただし、過去10〜15年以内に外壁塗装や屋根・水回りのリフォームが実施されているかを確認する（将来の修繕費に直結）",
          note: isInPriceSweetSpot
            ? `この物件は築${buildingAgeYears}年で、価格がこなれてくる築${PRICE_SWEET_SPOT_MIN_AGE_YEARS}〜${PRICE_SWEET_SPOT_MAX_AGE_YEARS}年の範囲に該当します。過去のリフォーム履歴を必ず確認しましょう`
            : undefined,
        },
        {
          id: "sunlightVentilationNoise",
          title: "陽当たり・風通し・騒音",
          description:
            "各部屋の陽当たり・風通しを確認する。周辺の交通量や近隣施設からの騒音・臭いがないか、昼夜で差がないかも確認する",
        },
      ],
    },
    {
      id: "realtorHearing",
      title: "不動産会社へのヒアリング事項",
      items: [
        {
          id: "boundarySurveyArrangement",
          title: "敷地の境界調査・確定の取り決め",
          description: "境界プレートが見当たらない場合、契約までに引き渡し条件として確定測量・明示をしてもらえるか？",
        },
        {
          id: "sellingReason",
          title: "売却理由の確認",
          description:
            "前オーナーが売却を決めた本当の理由は何か？（近隣トラブル、騒音、悪臭、ゴミ問題などの不適合要因がないか）",
        },
        {
          id: "totalAcquisitionCost",
          title: "購入総費用の算出",
          description:
            "物件価格＋諸費用（仲介手数料・登記費用・ローン諸費用等）だけでなく、引き渡し数ヶ月後に発生する不動産取得税を含めた総額概算を出してもらったか",
        },
      ],
    },
  ];
}
