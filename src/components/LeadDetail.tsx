"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  FileText,
  Phone,
  Mail,
  Check,
  Car,
  Search,
  Loader2,
  ExternalLink,
  Save,
} from "lucide-react";
import type { Lead, Status, VehicleData } from "@/lib/types";
import { STATUS_LABELS, PIPELINE_ORDER } from "@/lib/types";
import { useLeads } from "@/lib/store";
import { leadKey } from "@/lib/leadMeta";
import { formatDate, formatAmount } from "@/lib/format";
import {
  findRegnrInText,
  isValidRegnr,
  normalizeRegnr,
  transportstyrelsenUrl,
  biluppgifterUrl,
  type VehicleInfo,
} from "@/lib/vehicle";
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

  const insertToReply = useCallback((text: string) => {
    setReply((prev) => (prev ? `${prev}\n\n${text}` : text));
  }, []);

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

          {/* Sammanfattning */}
          {lead.aiSummary ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <FileText size={14} /> Sammanfattning
              </div>
              <p className="text-sm text-slate-800">{lead.aiSummary}</p>
            </div>
          ) : null}

          {/* Fordonsuppgifter */}
          <VehiclePanel lead={lead} onInsert={insertToReply} />

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
                  rows={5}
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

// --- Fordonspanel -----------------------------------------------------------

const EMPTY_FIELDS: VehicleFields = {
  brand: "",
  model: "",
  modelYear: "",
  color: "",
  mileageMil: "",
  lengthMm: "",
};

interface VehicleFields {
  brand: string;
  model: string;
  modelYear: string;
  color: string;
  mileageMil: string;
  lengthMm: string;
}

function toFields(v: Partial<VehicleData> | VehicleInfo): VehicleFields {
  return {
    brand: v.brand ?? "",
    model: v.model ?? "",
    modelYear: v.modelYear ? String(v.modelYear) : "",
    color: v.color ?? "",
    mileageMil: v.mileageMil != null ? String(v.mileageMil) : "",
    lengthMm: v.lengthMm != null ? String(v.lengthMm) : "",
  };
}

const FIELD_META: Array<{ key: keyof VehicleFields; label: string; ph: string }> = [
  { key: "brand", label: "Bilmärke", ph: "Volvo" },
  { key: "model", label: "Modell", ph: "XC60" },
  { key: "modelYear", label: "Årsmodell", ph: "2020" },
  { key: "color", label: "Färg", ph: "Silvermetallic" },
  { key: "mileageMil", label: "Miltal (mil)", ph: "6200" },
  { key: "lengthMm", label: "Längd (mm)", ph: "4688" },
];

function VehiclePanel({
  lead,
  onInsert,
}: {
  lead: Lead;
  onInsert: (text: string) => void;
}) {
  const { vehicles, setVehicle: saveVehicle } = useLeads();
  const key = leadKey(lead);
  const saved = vehicles[key];

  const initial = normalizeRegnr(
    saved?.regnr ?? lead.regnr ?? findRegnrInText(lead.body) ?? ""
  );
  const [regnr, setRegnr] = useState(initial);
  const [fields, setFields] = useState<VehicleFields>(
    saved ? toFields(saved) : EMPTY_FIELDS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<VehicleInfo["source"] | "saved" | null>(
    saved ? "saved" : null
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const setField = (k: keyof VehicleFields, v: string) =>
    setFields((prev) => ({ ...prev, [k]: v }));

  const fetchVehicle = useCallback(async (value: string) => {
    if (!isValidRegnr(value)) {
      setError("Ogiltigt registreringsnummer (t.ex. ABC123 eller ABC12D).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicle?regnr=${encodeURIComponent(normalizeRegnr(value))}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kunde inte hämta fordonsuppgifter.");
      } else {
        setFields(toFields(data as VehicleInfo));
        setOrigin((data as VehicleInfo).source);
      }
    } catch {
      setError("Kunde inte hämta fordonsuppgifter.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Vid öppning: har vi sparat, visa det. Annars hämta automatiskt om regnr finns.
  useEffect(() => {
    if (saved) return;
    if (initial && isValidRegnr(initial)) fetchVehicle(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  function persist() {
    if (!isValidRegnr(regnr)) {
      setError("Ange ett giltigt registreringsnummer innan du sparar.");
      return;
    }
    const data: VehicleData = {
      regnr: normalizeRegnr(regnr),
      brand: fields.brand.trim() || undefined,
      model: fields.model.trim() || undefined,
      modelYear: fields.modelYear ? Number(fields.modelYear) : undefined,
      color: fields.color.trim() || undefined,
      mileageMil: fields.mileageMil ? Number(fields.mileageMil) : undefined,
      lengthMm: fields.lengthMm ? Number(fields.lengthMm) : undefined,
    };
    saveVehicle(key, data);
    setOrigin("saved");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  function insert() {
    const parts = [fields.brand, fields.model].filter(Boolean).join(" ");
    const yr = fields.modelYear ? ` (${fields.modelYear})` : "";
    const col = fields.color ? `, ${fields.color}` : "";
    const text = `Fordon: ${parts}${yr}${col}, reg.nr ${normalizeRegnr(regnr)}.`;
    onInsert(text);
  }

  const originLabel: Record<string, { text: string; cls: string }> = {
    demo: { text: "demo", cls: "bg-slate-100 text-slate-400" },
    scrape: { text: "Transportstyrelsen", cls: "bg-emerald-100 text-emerald-700" },
    api: { text: "API", cls: "bg-emerald-100 text-emerald-700" },
    saved: { text: "sparat", cls: "bg-brand-100 text-brand-700" },
    manual: { text: "manuellt", cls: "bg-brand-100 text-brand-700" },
  };
  const badge = origin ? originLabel[origin] : null;
  const validRegnr = isValidRegnr(regnr);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <Car size={15} /> Fordonsuppgifter
        {badge ? (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-normal ${badge.cls}`}>
            {badge.text}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={regnr}
          onChange={(e) => setRegnr(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && fetchVehicle(regnr)}
          placeholder="ABC123"
          className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono uppercase tracking-wider focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={() => fetchVehicle(regnr)}
          disabled={loading || !regnr}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-40"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Hämta
        </button>
      </div>

      {/* Gratis officiella uppslag – ett klick, öppnas i ny flik */}
      {validRegnr ? (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <a
            href={transportstyrelsenUrl(regnr)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
          >
            <ExternalLink size={12} /> Transportstyrelsen (gratis)
          </a>
          <a
            href={biluppgifterUrl(regnr)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
          >
            <ExternalLink size={12} /> biluppgifter.se
          </a>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      {/* Redigerbara fält – fyll i själv eller justera hämtade uppgifter */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {FIELD_META.map((f) => (
          <label key={f.key} className="min-w-0">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              {f.label}
            </span>
            <input
              value={fields[f.key]}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.ph}
              className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={persist}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          {savedFlash ? <Check size={14} /> : <Save size={14} />}
          {savedFlash ? "Sparat" : "Spara på ärendet"}
        </button>
        <button
          onClick={insert}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          + Infoga i svaret
        </button>
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Tips: klicka på Transportstyrelsen ovan för gratis uppgifter, fyll i fälten
        och spara på ärendet.
      </p>
    </div>
  );
}
