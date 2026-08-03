"use client";

import { useState } from "react";
import { Send, Check, Mail, CalendarCheck, XCircle, Info } from "lucide-react";
import { useLeads } from "@/lib/store";
import { pendingFollowUps, CADENCE_DAYS, type FollowUpSuggestion } from "@/lib/follow-up";
import { formatAmount } from "@/lib/format";
import { PageHeader, Loading, EmptyState, Avatar } from "@/components/ui";

export default function FollowUpPage() {
  const { leads, loaded } = useLeads();
  if (!loaded) return <Loading />;

  const suggestions = pendingFollowUps(leads);

  return (
    <>
      <PageHeader
        title="Uppföljningar"
        subtitle="Offerter där kunden inte återkommit – godkänn ett förslag och skicka"
      />

      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            Förslagen bygger på säljforskning: följ upp efter{" "}
            {CADENCE_DAYS.join(", ")} dagar. 80 % av affärer kräver flera
            uppföljningar. Meddelandet är förifyllt – redigera fritt innan du skickar.
          </p>
        </div>

        {suggestions.length ? (
          suggestions.map((s) => <FollowUpCard key={s.lead.id} suggestion={s} />)
        ) : (
          <EmptyState>Inga uppföljningar behövs just nu. 👍</EmptyState>
        )}
      </div>
    </>
  );
}

function FollowUpCard({ suggestion }: { suggestion: FollowUpSuggestion }) {
  const { markFollowUpSent, updateStatus } = useLeads();
  const { lead, step, daysSinceQuote, isFinal } = suggestion;
  const [subject, setSubject] = useState(suggestion.subject);
  const [body, setBody] = useState(suggestion.body);
  const [done, setDone] = useState<null | string>(null);
  const [sending, setSending] = useState(false);

  const mailto = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  async function sendFollowUp() {
    setSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: lead.email, subject, body }),
      });
      const data = await res.json();
      if (data.error) {
        setDone(`Kunde inte skicka: ${data.error}`);
        return;
      }
      markFollowUpSent(lead.id);
      const label = isFinal ? "Avslut" : `Uppföljning ${step}`;
      setDone(
        data.sent ? `${label} skickad via mejl` : `${label} markerad (demoläge – SMTP ej kopplat)`
      );
    } catch {
      setDone("Kunde inte nå mejlservern.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <Check size={18} /> {done} – {lead.from}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={lead.from} />
          <div>
            <div className="text-sm font-semibold text-slate-900">{lead.from}</div>
            <div className="text-xs text-slate-400">
              {lead.service} · offert {formatAmount(lead.quoteAmount)} · {daysSinceQuote} dagar
              sedan
            </div>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            isFinal ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700"
          }`}
        >
          {isFinal ? "Avslutsförslag" : `Uppföljning ${step}`}
        </span>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Ämne</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Meddelande</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={sendFollowUp}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Send size={15} /> {sending ? "Skickar…" : "Skicka uppföljning"}
          </button>
          <a
            href={mailto}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Mail size={15} /> Öppna i e-postprogram
          </a>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                updateStatus(lead.id, "bokad");
                setDone("Markerad som bokad");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <CalendarCheck size={15} /> Kund bokade
            </button>
            <button
              onClick={() => {
                updateStatus(lead.id, "ingen_affar");
                setDone("Markerad som ingen affär");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              <XCircle size={15} /> Ingen affär
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
