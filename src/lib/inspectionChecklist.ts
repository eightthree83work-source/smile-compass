import { Property } from "./types";

export interface InspectionChecklistItem {
  id: string;
  /** チェック項目名 */
  title: string;
  /** 何を見るか（具体的な確認方法） */
  description: string;
  /** 優先確認項目かどうか */
  priority: boolean;
  /** 優先項目とされる理由（priorityがtrueの場合のみ） */
  priorityReason?: string;
}

/** シロアリ被害の確認を優先項目とする木造住宅の築年数の下限 */
const WOOD_TERMITE_RISK_AGE_YEARS = 20;
/** 給排水管の交換履歴確認を優先項目とする築年数の下限 */
const PLUMBING_REPLACEMENT_CHECK_AGE_YEARS = 30;

/** 築年数・構造から、内覧時に確認すべきチェックポイントを動的に生成する（ルールベース） */
export function getInspectionChecklist(property: Property): InspectionChecklistItem[] {
  const { buildingAgeYears, structureType } = property;

  const items: InspectionChecklistItem[] = [
    {
      id: "waterLeakTraces",
      title: "雨漏り跡",
      description: "天井・壁のシミやクロスの剥がれ、カビ臭がないか確認する",
      priority: false,
    },
    {
      id: "foundationCracks",
      title: "基礎のひび割れ",
      description: "建物外周の基礎に幅0.3mm以上のひび割れや欠損がないか確認する",
      priority: false,
    },
    {
      id: "floorTilt",
      title: "床の傾き",
      description: "ビー玉を置く、または水平器で床の傾き・沈みがないか確認する",
      priority: false,
    },
    {
      id: "plumbingDeterioration",
      title: "給排水管の劣化",
      description: "水回りの水漏れ跡、排水の流れの悪さ、配管のサビ・劣化を確認する",
      priority: false,
    },
    {
      id: "roofMaterialDeterioration",
      title: "屋根材の劣化",
      description: "屋根材のズレ・割れ・色あせ、雨樋の詰まりや破損を確認する",
      priority: false,
    },
    {
      id: "exteriorWallCracksAndSealing",
      title: "外壁のひび割れ・シーリングの劣化",
      description: "外壁のクラック、シーリング（コーキング）のひび割れ・剥離、目地の劣化を確認する",
      priority: false,
    },
  ];

  if (structureType === "wood" && buildingAgeYears > WOOD_TERMITE_RISK_AGE_YEARS) {
    items.push({
      id: "termiteDamage",
      title: "シロアリ被害の確認",
      description: "土台・柱の食害跡、木部を叩いた際の空洞音、羽アリの死骸や蟻道の有無を確認する",
      priority: true,
      priorityReason: `築${WOOD_TERMITE_RISK_AGE_YEARS}年を超える木造住宅はシロアリ被害のリスクが高まるため`,
    });
  }

  if (buildingAgeYears > PLUMBING_REPLACEMENT_CHECK_AGE_YEARS) {
    items.push({
      id: "plumbingReplacementHistory",
      title: "給排水管の交換履歴の確認",
      description:
        "給水管・排水管が交換済みか、交換時期を売主・仲介に確認する（未交換の場合は将来の更新費用を想定する）",
      priority: true,
      priorityReason: `築${PLUMBING_REPLACEMENT_CHECK_AGE_YEARS}年を超えると配管の経年劣化リスクが高いため`,
    });
  }

  if (structureType === "steel" || structureType === "rc" || structureType === "src") {
    items.push(
      {
        id: "concreteCracking",
        title: "コンクリートのひび割れ",
        description: "外壁・バルコニー・柱梁のコンクリートに幅0.3mm以上のひび割れや剥落がないか確認する",
        priority: false,
      },
      {
        id: "rebarExposure",
        title: "鉄筋の露出（爆裂）",
        description: "コンクリート表面のさび汁や鉄筋の露出（爆裂現象）がないか確認する。中性化・耐久性低下のサイン",
        priority: false,
      },
    );
  }

  return [...items].sort((a, b) => Number(b.priority) - Number(a.priority));
}
