"use client";

import { useState } from "react";
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  Folder,
} from "lucide-react";
import { PageHeader } from "@/components/ui";

interface TestResult {
  configured: boolean;
  imap: { ok: boolean; account?: string; folders?: string[]; error?: string };
  smtp: { ok: boolean; from?: string; error?: string };
}

export default function MejlPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function test() {
    setLoading(true);
    try {
      const res = await fetch("/api/mail/test");
      setResult(await res.json());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Mejlkoppling"
        subtitle="Testa anslutningen till info@ditecsisjon.se (Websupport) innan du hämtar riktiga mejl"
        action={
          <button
            onClick={test}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Testar…" : "Testa koppling"}
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {!result ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            <Mail size={28} className="mx-auto mb-3 text-slate-300" />
            Klicka på <span className="font-medium">Testa koppling</span> för att
            kontrollera att IMAP (inkommande) och SMTP (utgående) fungerar.
            <br />
            Fyll först i <code className="rounded bg-slate-100 px-1">IMAP_USER</code> och{" "}
            <code className="rounded bg-slate-100 px-1">IMAP_PASSWORD</code> i{" "}
            <code className="rounded bg-slate-100 px-1">.env.local</code> och starta om appen.
          </div>
        ) : (
          <>
            {!result.configured ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                IMAP är inte konfigurerat. Sätt <code>IMAP_USER</code> och{" "}
                <code>IMAP_PASSWORD</code> i <code>.env.local</code> och starta om appen.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {/* IMAP */}
              <StatusCard
                icon={<Inbox size={18} />}
                title="Inkommande (IMAP)"
                ok={result.imap.ok}
                lines={[
                  result.imap.account ? `Konto: ${result.imap.account}` : "",
                  result.imap.ok
                    ? "Anslutning lyckades ✓"
                    : result.imap.error ?? "Kunde inte ansluta.",
                ].filter(Boolean)}
              />
              {/* SMTP */}
              <StatusCard
                icon={<Send size={18} />}
                title="Utgående (SMTP)"
                ok={result.smtp.ok}
                lines={[
                  result.smtp.from ? `Avsändare: ${result.smtp.from}` : "",
                  result.smtp.ok
                    ? "Verifierad ✓ (redo att skicka svar)"
                    : result.smtp.error ?? "Kunde inte verifiera.",
                ].filter(Boolean)}
              />
            </div>

            {/* Mappar – för att kunna filtrera bort brus */}
            {result.imap.ok && result.imap.folders?.length ? (
              <section>
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Folder size={15} /> Dina mappar
                </h2>
                <p className="mb-2 text-xs text-slate-500">
                  Leads blandas ofta med annan post i INBOX. Vill du bara läsa en viss
                  mapp (t.ex. en <em>Offerter</em>-mapp du sorterar leads till), sätt
                  mappens exakta namn som <code>IMAP_MAILBOX</code> i <code>.env.local</code>.
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.imap.folders.map((f) => (
                    <span
                      key={f}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-600"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {result.imap.ok && result.smtp.ok ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Allt fungerar! Gå till <span className="font-medium">Inkorg</span> – dina
                riktiga mejl hämtas automatiskt.
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function StatusCard({
  icon,
  title,
  ok,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  ok: boolean;
  lines: string[];
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        ok ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <span className="font-semibold text-slate-800">{title}</span>
        <span className="ml-auto">
          {ok ? (
            <CheckCircle2 size={20} className="text-emerald-600" />
          ) : (
            <XCircle size={20} className="text-rose-500" />
          )}
        </span>
      </div>
      {lines.map((l, i) => (
        <p key={i} className="text-sm text-slate-600">
          {l}
        </p>
      ))}
    </div>
  );
}
