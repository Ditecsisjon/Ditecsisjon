"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { useLeads } from "@/lib/store";
import { pendingFollowUps } from "@/lib/follow-up";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { PageHeader, StatCard, Loading, EmptyState } from "@/components/ui";
import { LeadRow } from "@/components/LeadRow";
import { LeadDetail } from "@/components/LeadDetail";

const CATEGORY_BAR: Record<Category, string> = {
  offert: "bg-amber-400",
  bokning: "bg-emerald-400",
  konsultation: "bg-violet-400",
  ovrigt: "bg-slate-300",
};

export default function DashboardPage() {
  const { leads, loaded } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  if (!loaded) return <Loading />;

  const unhandled = leads.filter((l) => l.status === "ny" || l.status === "obesvarad");
  const awaitingQuote = leads.filter((l) => l.status === "offert_skickad");
  const followUps = pendingFollowUps(leads);
  const booked = leads.filter((l) => l.status === "bokad");
  const pipelineValue = awaitingQuote.reduce((sum, l) => sum + (l.quoteAmount ?? 0), 0);

  const byCategory = (["offert", "bokning", "konsultation", "ovrigt"] as Category[]).map(
    (c) => ({ category: c, count: leads.filter((l) => l.category === c).length })
  );
  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

  return (
    <>
      <PageHeader
        title="Översikt"
        subtitle={`${leads.length} ärenden totalt · ${unhandled.length} väntar på hantering`}
      />

      <div className="space-y-6 p-8">
        {/* Nyckeltal */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Obesvarade"
            value={unhandled.length}
            hint="Nya + olästa ärenden"
            accent={unhandled.length ? "text-rose-600" : "text-slate-900"}
          />
          <StatCard
            label="Offerter väntar svar"
            value={awaitingQuote.length}
            hint={`${formatAmount(pipelineValue)} i pipeline`}
            accent="text-amber-600"
          />
          <StatCard
            label="Uppföljningar att göra"
            value={followUps.length}
            hint="Offerter utan svar"
            accent={followUps.length ? "text-brand-600" : "text-slate-900"}
          />
          <StatCard
            label="Bokade"
            value={booked.length}
            hint="Vunna affärer"
            accent="text-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Att göra idag */}
          <div className="lg:col-span-2 space-y-6">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Att hantera</h2>
                <Link href="/" className="text-xs text-brand-600 hover:underline">
                  Till inkorgen
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {unhandled.length ? (
                  unhandled
                    .slice(0, 5)
                    .map((l) => (
                      <LeadRow key={l.id} lead={l} onClick={() => setSelectedId(l.id)} />
                    ))
                ) : (
                  <EmptyState>Inga obesvarade ärenden – bra jobbat! 🎉</EmptyState>
                )}
              </div>
            </section>

            {/* Uppföljningar */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">
                  Föreslagna uppföljningar
                </h2>
                <Link href="/follow-up" className="text-xs text-brand-600 hover:underline">
                  Se alla
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {followUps.length ? (
                  followUps.slice(0, 4).map(({ lead, daysSinceQuote, isFinal }) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between border-b border-slate-100 px-5 py-3 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">{lead.from}</div>
                        <div className="text-xs text-slate-400">
                          {lead.service} · offert {formatAmount(lead.quoteAmount)} ·{" "}
                          {daysSinceQuote} dagar sedan
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isFinal
                            ? "bg-slate-100 text-slate-500"
                            : "bg-brand-50 text-brand-700"
                        }`}
                      >
                        {isFinal ? "Föreslå avslut" : "Följ upp"}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState>Inga uppföljningar behövs just nu.</EmptyState>
                )}
              </div>
              {followUps.length ? (
                <Link
                  href="/follow-up"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Send size={15} /> Hantera uppföljningar
                  <ArrowRight size={15} />
                </Link>
              ) : null}
            </section>
          </div>

          {/* Fördelning per kategori */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Ärenden per kategori</h2>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              {byCategory.map(({ category, count }) => (
                <div key={category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{CATEGORY_LABELS[category]}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${CATEGORY_BAR[category]}`}
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected ? <LeadDetail lead={selected} onClose={() => setSelectedId(null)} /> : null}
    </>
  );
}
