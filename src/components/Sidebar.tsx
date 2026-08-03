"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  KanbanSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { useLeads } from "@/lib/store";
import { pendingFollowUps } from "@/lib/follow-up";

const NAV = [
  { href: "/", label: "Översikt", icon: LayoutDashboard },
  { href: "/inbox", label: "Inkorg", icon: Inbox },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/follow-up", label: "Uppföljningar", icon: Send },
];

export function Sidebar() {
  const pathname = usePathname();
  const { leads } = useLeads();

  const unhandled = leads.filter((l) => l.status === "ny" || l.status === "obesvarad").length;
  const followUps = pendingFollowUps(leads).length;

  const badges: Record<string, number> = {
    "/inbox": unhandled,
    "/follow-up": followUps,
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Ditec Inkorg</div>
          <div className="text-xs text-slate-400">Sisjön</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const badge = badges[href];
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {label}
              </span>
              {badge ? (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-400">
        Demoläge med exempeldata.
        <br />
        Koppla Gmail i steg 2.
      </div>
    </aside>
  );
}
