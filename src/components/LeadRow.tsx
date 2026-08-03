"use client";

import type { Lead } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { CategoryBadge, StatusBadge, PriorityDot } from "./Badges";
import { Avatar } from "./ui";

export function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b border-slate-100 bg-white px-5 py-3.5 text-left transition hover:bg-slate-50"
    >
      <Avatar name={lead.from} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{lead.from}</span>
          {lead.service ? (
            <span className="truncate text-xs text-slate-400">· {lead.service}</span>
          ) : null}
        </div>
        <div className="truncate text-sm text-slate-600">{lead.subject}</div>
        <div className="truncate text-xs text-slate-400">{lead.preview}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs text-slate-400">{formatRelativeTime(lead.receivedAt)}</span>
        <div className="flex items-center gap-1.5">
          <CategoryBadge category={lead.category} />
          <StatusBadge status={lead.status} />
        </div>
        <PriorityDot priority={lead.priority} />
      </div>
    </button>
  );
}
