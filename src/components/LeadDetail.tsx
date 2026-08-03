"use client";

import { useState } from "react";
import { X, Sparkles, Phone, Mail, Check } from "lucide-react";
import type { Lead, Status } from "@/lib/types";
import { STATUS_LABELS, PIPELINE_ORDER } from "@/lib/types";
import { useLeads } from "@/lib/store";
import { formatDate, formatAmount } from "@/lib/format";
import { CategoryBadge, StatusBadge, PriorityDot } from "./Badges";
import { Avatar } from "./ui";

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { updateStatus, markAnswered } = useLeads();
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!reply.trim()) return;
    markAnswered(lead.id);
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={lead.from} />
            <div>
              <div className="font-semibold text-slate-900">{lead.from}</div>
              <div className="text-xs text-slate-500">{lead.email}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CategoryBadge category={lead.category} />
            <StatusBadge status={lead.status} />
            <PriorityDot priority={lead.priority} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">{lead.subject}</h2>
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>{formatDate(lead.receivedAt)}</span>
            {lead.service ? <span>Tjänst: {lead.service}</span> : null}
            {lead.quoteAmount ? <span>Offert: {formatAmount(lead.quoteAmount)}</span> : null}
          </div>

          {/* AI-sammanfattning */}
          {lead.aiSummary ? (
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                <Sparkles size={14} /> AI-sammanfattning
                {lead.aiConfidence ? (
                  <span className="font-normal text-violet-400">
                    · {Math.round(lead.aiConfidence * 100)}% säkerhet
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-violet-900">{lead.aiSummary}</p>
            </div>
          ) : null}

          {/* Mejltext */}
          <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {lead.body}
          </div>

          {/* Kontakt */}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
            >
              <Mail size={15} /> {lead.email}
            </a>
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
              >
                <Phone size={15} /> {lead.phone}
              </a>
            ) : null}
          </div>

          {/* Svarsruta */}
          <div className="mt-6">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Svara kunden
            </label>
            {sent ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <Check size={16} /> Svar registrerat – ärendet är markerat som besvarat.
              </div>
            ) : (
              <>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder={`Hej ${lead.from.split(" ")[0]}, tack för din förfrågan …`}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim()}
                  className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Skicka svar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Statusfot */}
        <div className="border-t border-slate-200 px-6 py-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">
            Ändra status
          </label>
          <div className="flex flex-wrap gap-2">
            {PIPELINE_ORDER.map((s: Status) => (
              <button
                key={s}
                onClick={() => updateStatus(lead.id, s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  lead.status === s
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
