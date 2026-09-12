"use client";

import { useState } from "react";
import { InspectorCharacterImage } from "@/components/icons/AdvisorCharacterImages";
import { Property } from "@/lib/types";
import { getInspectionChecklist } from "@/lib/inspectionChecklist";

interface InspectionSectionProps {
  property: Property;
}

export default function InspectionSection({ property }: InspectionSectionProps) {
  const checklist = getInspectionChecklist(property);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <InspectorCharacterImage className="h-14 w-14 shrink-0" />
        <h2 className="font-heading text-xl text-ink">住宅診断士のサポート</h2>
      </div>

      <p className="rounded-md border border-ink/15 bg-ink/5 p-3 text-sm text-ink/65">
        このチェックリストは内覧時の一般的な確認の目安であり、専門家による建物状況調査（インスペクション）の代わりにはなりません。気になる点があれば専門家への依頼をご検討ください。
      </p>

      <ul id="inspection-checklist-section" className="scroll-mt-4 space-y-3">
        {checklist.map((item) => (
          <li key={item.id} className="rounded-lg border border-ink/15 bg-white p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent"
                checked={Boolean(checkedIds[item.id])}
                onChange={() => toggle(item.id)}
              />
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-ink">{item.title}</span>
                  {item.priority && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fab219]/15 px-2 py-0.5 text-xs font-medium text-[#8a5c0a]">
                      <span aria-hidden>⚠</span>
                      優先確認
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-ink/55">{item.description}</span>
                {item.priorityReason && <span className="mt-1 block text-sm text-ink/70">{item.priorityReason}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
