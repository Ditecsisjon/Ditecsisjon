"use client";

import { useState } from "react";
import { useLeads } from "@/lib/store";
import {
  PIPELINE_ORDER,
  STATUS_LABELS,
  type Lead,
  type Status,
} from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { PageHeader, Loading } from "@/components/ui";
import { CategoryBadge, PriorityDot } from "@/components/Badges";
import { LeadDetail } from "@/components/LeadDetail";

const COLUMN_ACCENT: Record<Status, string> = {
  ny: "border-t-brand-400",
  obesvarad: "border-t-rose-400",
  besvarad: "border-t-sky-400",
  offert_skickad: "border-t-amber-400",
  bokad: "border-t-emerald-400",
  ingen_affar: "border-t-slate-300",
};

export default function PipelinePage() {
  const { leads, loaded } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  if (!loaded) return <Loading />;

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Dra affärer genom flödet – klicka på ett kort för att ändra status"
      />

      <div className="flex h-[calc(100%-73px)] gap-4 overflow-x-auto p-8 thin-scroll">
        {PIPELINE_ORDER.map((status) => {
          const items = leads.filter((l) => l.status === status);
          const value = items.reduce((s, l) => s + (l.quoteAmount ?? 0), 0);
          return (
            <div key={status} className="flex w-72 shrink-0 flex-col">
              <div
                className={`mb-3 rounded-t-lg border-t-4 bg-white px-3 py-2 ${COLUMN_ACCENT[status]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {items.length}
                  </span>
                </div>
                {value > 0 ? (
                  <div className="mt-0.5 text-xs text-slate-400">{formatAmount(value)}</div>
                ) : null}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto thin-scroll pr-1">
                {items.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => setSelectedId(lead.id)}
                  />
                ))}
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
                    Tomt
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {selected ? <LeadDetail lead={selected} onClose={() => setSelectedId(null)} /> : null}
    </>
  );
}

function PipelineCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-slate-900">{lead.from}</span>
        <PriorityDot priority={lead.priority} />
      </div>
      <div className="mt-0.5 truncate text-xs text-slate-500">{lead.subject}</div>
      <div className="mt-2 flex items-center justify-between">
        <CategoryBadge category={lead.category} />
        {lead.quoteAmount ? (
          <span className="text-xs font-medium text-slate-600">
            {formatAmount(lead.quoteAmount)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
