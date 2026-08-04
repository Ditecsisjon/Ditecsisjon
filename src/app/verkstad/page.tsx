"use client";

import { useEffect, useState } from "react";
import { Wrench, RefreshCw } from "lucide-react";
import { PageHeader, StatCard, Loading } from "@/components/ui";
import type { Technician, WeekSchedule } from "@/lib/planner";

interface Info {
  source: string;
  technicians: Technician[];
  competenceLabels: Record<string, string>;
  week: WeekSchedule;
}

function loadColor(booked: number, total: number): string {
  if (total === 0) return "bg-slate-100 text-slate-400";
  const r = booked / total;
  if (r >= 1) return "bg-rose-100 text-rose-700";
  if (r >= 0.66) return "bg-amber-100 text-amber-700";
  if (r > 0) return "bg-sky-100 text-sky-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function VerkstadPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/planner/info");
      setInfo(await res.json());
    } catch {
      /* ignorera */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !info) return <Loading />;
  if (!info) return <div className="p-8 text-sm text-slate-400">Kunde inte hämta verkstadsinfo.</div>;

  const { technicians, competenceLabels, week } = info;

  // Beläggning
  let booked = 0;
  let total = 0;
  for (const t of technicians) {
    for (const day of week.days) {
      const td = week.grid[t.id]?.[day.dateISO];
      if (td) {
        booked += td.booked;
        total += td.booked + td.free;
      }
    }
  }
  const occupancy = total ? Math.round((booked / total) * 100) : 0;

  // Kompetensöversikt
  const compCount: Record<string, number> = {};
  for (const t of technicians)
    for (const c of t.competences) compCount[c] = (compCount[c] ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Verkstad & planering"
        subtitle={
          info.source === "demo"
            ? "Tekniker, kompetenser och beläggning (demo – kopplas mot verkstadsplaneraren)"
            : "Live från verkstadsplaneraren"
        }
        action={
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={15} /> Uppdatera
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {/* Nyckeltal */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Tekniker" value={technicians.length} />
          <StatCard label="Beläggning (v)" value={`${occupancy}%`} accent="text-brand-600" />
          <StatCard label="Lediga pass (v)" value={total - booked} accent="text-emerald-600" />
          <StatCard label="Bokade pass (v)" value={booked} accent="text-amber-600" />
        </div>

        {/* Tekniker & kompetenser */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Tekniker & kompetenser</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {technicians.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    <Wrench size={16} />
                  </div>
                  <div className="font-semibold text-slate-900">{t.name}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.competences.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {competenceLabels[c] ?? c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Kompetenstäckning */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Kompetenstäckning</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(compCount).map(([c, n]) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
              >
                {competenceLabels[c] ?? c}
                <span className="rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">
                  {n} tekniker
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* Veckoschema */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Beläggning denna vecka (bokade pass / 3)
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white thin-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Tekniker</th>
                  {week.days.map((d) => (
                    <th key={d.dateISO} className="px-4 py-2 text-center font-medium capitalize">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {technicians.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    {week.days.map((d) => {
                      const td = week.grid[t.id]?.[d.dateISO];
                      const b = td?.booked ?? 0;
                      const tot = td ? td.booked + td.free : 0;
                      return (
                        <td key={d.dateISO} className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${loadColor(
                              b,
                              tot
                            )}`}
                            title={
                              td
                                ? td.slots.map((s) => `${s.label}: ${s.busy ? "bokat" : "ledigt"}`).join("\n")
                                : ""
                            }
                          >
                            {b}/{tot}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Grön = ledigt, blå/gul = delvis bokat, röd = fullt. Håll muspekaren över en ruta för
            passdetaljer.
          </p>
        </section>
      </div>
    </>
  );
}
