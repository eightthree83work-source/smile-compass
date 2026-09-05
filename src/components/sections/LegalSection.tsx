"use client";

import { useState } from "react";
import { LegalAdvisorIcon } from "@/components/icons/AdvisorIcons";
import { Property } from "@/lib/types";
import { getLegalChecklist } from "@/lib/legalChecklist";

interface LegalSectionProps {
  property: Property;
}

export default function LegalSection({ property }: LegalSectionProps) {
  const checklist = getLegalChecklist(property);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <LegalAdvisorIcon className="h-14 w-14 shrink-0 text-ink/70" />
        <h2 className="font-heading text-xl text-ink">宅建士の目</h2>
      </div>

      <p className="rounded-md border border-ink/15 bg-ink/5 p-3 text-sm text-ink/65">
        これは一般的な注意喚起であり、法的助言ではありません。契約前には宅地建物取引士による重要事項説明を必ずご確認ください。
      </p>

      <ul className="space-y-3">
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
                <span className="block font-medium text-ink">{item.title}</span>
                <span className="mt-0.5 block text-sm text-ink/55">{item.reason}</span>
                {item.note && <span className="mt-1 block text-sm text-ink/70">{item.note}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
