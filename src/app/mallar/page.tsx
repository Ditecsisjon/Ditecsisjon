"use client";

import { useLeads } from "@/lib/store";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import {
  DEFAULT_TEMPLATES,
  EDITABLE_SERVICES,
  PLACEHOLDERS,
} from "@/lib/suggest";
import { PageHeader, Loading } from "@/components/ui";
import { RotateCcw } from "lucide-react";

const CATEGORIES: Category[] = ["offert", "bokning", "konsultation", "ovrigt"];

export default function TemplatesPage() {
  const { loaded, templates, setTemplate } = useLeads();
  if (!loaded) return <Loading />;

  return (
    <>
      <PageHeader
        title="Svarsmallar"
        subtitle="Förbättra AI-förslagen som fylls i när du klickar “Förslag” i ett svar"
      />

      <div className="mx-auto max-w-3xl space-y-6 p-8">
        {/* Platshållare-hjälp */}
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          <div className="mb-1 font-semibold">Platshållare (fylls i automatiskt):</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {PLACEHOLDERS.map((p) => (
              <span key={p.token}>
                <code className="rounded bg-white px-1 py-0.5 font-mono text-brand-700">
                  {p.token}
                </code>{" "}
                {p.desc}
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-brand-700">Ändringar sparas automatiskt.</div>
        </div>

        {/* Per ärendetyp */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Per ärendetyp</h2>
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const value = templates[cat] ?? DEFAULT_TEMPLATES[cat];
              return (
                <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <button
                      onClick={() => setTemplate(cat, DEFAULT_TEMPLATES[cat])}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <RotateCcw size={12} /> Återställ till standard
                    </button>
                  </div>
                  <textarea
                    value={value}
                    onChange={(e) => setTemplate(cat, e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Per tjänst */}
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Per tjänst (valfritt)</h2>
          <p className="mb-2 text-xs text-slate-400">
            Lämnas en tjänst tom används mallen för ärendetypen. Fyll i för att ge en
            specifik tjänst ett eget svar.
          </p>
          <div className="space-y-4">
            {EDITABLE_SERVICES.map((svc) => (
              <div key={svc} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{svc}</span>
                  {templates[svc] ? (
                    <button
                      onClick={() => setTemplate(svc, "")}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <RotateCcw size={12} /> Rensa
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={templates[svc] ?? ""}
                  onChange={(e) => setTemplate(svc, e.target.value)}
                  rows={5}
                  placeholder={`Egen mall för ${svc.toLowerCase()} (valfritt)…`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
