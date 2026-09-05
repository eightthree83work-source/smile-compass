import { Property } from "./types";
import { meetsOldHomeBuildingStandard } from "./calculations";

export interface LegalChecklistItem {
  id: string;
  /** チェック項目名 */
  title: string;
  /** なぜ重要か（一言） */
  reason: string;
  /** 物件データに基づく補足（該当する項目のみ） */
  note?: string;
}

/** 中古戸建て購入時、重要事項説明で扱われる代表的なチェック項目（ルールベース） */
export function getLegalChecklist(property: Property): LegalChecklistItem[] {
  const meetsSeismicStandard = meetsOldHomeBuildingStandard(property);

  return [
    {
      id: "landUseZone",
      title: "用途地域",
      reason: "建築可能な用途や建て替え時の規模・構造の制限を左右するため",
    },
    {
      id: "roadAccess",
      title: "接道義務",
      reason: "建築基準法の接道義務を満たさないと将来の建て替え・再建築ができないおそれがあるため",
    },
    {
      id: "encroachment",
      title: "越境物の有無",
      reason: "塀・屋根・配管などの越境は境界紛争や将来の建て替え時の障害になるため",
    },
    {
      id: "rightsStatus",
      title: "権利関係（所有権・抵当権の状況）",
      reason: "抵当権抹消や共有者の同意がなければ引渡し・登記に支障が出るため",
    },
    {
      id: "defectLiability",
      title: "瑕疵担保責任（契約不適合責任）の範囲",
      reason: "引渡し後に発見した欠陥の補修・賠償を請求できる範囲を左右するため",
    },
    {
      id: "seismicCertificateNecessity",
      title: "耐震基準適合証明の要否",
      reason: "築年数や耐震性により、税制優遇（住宅ローン控除等）の適用可否が変わるため",
      note: meetsSeismicStandard
        ? "築1982年以降、または耐震基準適合証明書により基準を満たしています"
        : "築1982年より古く、耐震基準適合証明書もありません。取得の可否を確認しましょう",
    },
  ];
}
