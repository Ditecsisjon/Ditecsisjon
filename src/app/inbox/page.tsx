"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLeads } from "@/lib/store";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type Category,
  type Status,
} from "@/lib/types";
import { PageHeader, Loading, EmptyState } from "@/components/ui";
import { LeadRow } from "@/components/LeadRow";
import { LeadDetail } from "@/components/LeadDetail";

type CatFilter = Category | "alla";
type StatusFilter = Status | "alla" | "obesvarade";

export default function InboxPage() {
  const { leads, loaded } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatFilter>("alla");
  const [status, setStatus] = useState<StatusFilter>("alla");

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        if (cat !== "alla" && l.category !== cat) return false;
        if (status === "obesvarade" && l.status !== "ny" && l.status !== "obesvarad")
          return false;
        if (status !== "alla" && status !== "obesvarade" && l.status !== status) return false;
        if (query) {
          const q = query.toLowerCase();
          const hay = `${l.from} ${l.email} ${l.subject} ${l.body} ${l.service ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt));
  }, [leads, cat, status, query]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  if (!loaded) return <Loading />;

  const catOptions: CatFilter[] = ["alla", "offert", "bokning", "konsultation", "ovrigt"];
  const statusOptions: StatusFilter[] = [
    "alla",
    "obesvarade",
    "offert_skickad",
    "bokad",
    "ingen_affar",
  ];

  return (
    <>
      <PageHeader
        title="Inkorg"
        subtitle={`${filtered.length} av ${leads.length} ärenden`}
      />

      {/* Filterrad */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-8 py-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök namn, ämne, tjänst…"
            className="w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex gap-1.5">
          {catOptions.map((c) => (
            <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c === "alla" ? "Alla kategorier" : CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>

        <div className="ml-auto flex gap-1.5">
          {statusOptions.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "alla"
                ? "Alla statusar"
                : s === "obesvarade"
                ? "Obesvarade"
                : STATUS_LABELS[s]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {filtered.length ? (
            filtered.map((l) => (
              <LeadRow key={l.id} lead={l} onClick={() => setSelectedId(l.id)} />
            ))
          ) : (
            <EmptyState>Inga ärenden matchar filtret.</EmptyState>
          )}
        </div>
      </div>

      {selected ? <LeadDetail lead={selected} onClose={() => setSelectedId(null)} /> : null}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-brand-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
