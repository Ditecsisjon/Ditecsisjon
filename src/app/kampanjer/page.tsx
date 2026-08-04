"use client";

import { useState } from "react";
import {
  Send,
  Download,
  MessageSquare,
  Check,
  Loader2,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { useCampaign } from "@/lib/useCampaign";
import {
  messageFor,
  autoReply,
  needsReminder,
  variantStats,
  recipientSize,
  classifyReply,
  REPLY_LABEL,
  type Recipient,
  type ReplyType,
} from "@/lib/campaign";
import { SIZE_LABEL } from "@/lib/pricing";
import { PageHeader, StatCard, Loading } from "@/components/ui";

async function sendSms(to: string, message: string) {
  try {
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, message }),
    });
    const data = await res.json();
    if (data.error) return { ok: false, error: data.error as string };
    return { ok: true, demo: data.configured === false };
  } catch {
    return { ok: false, error: "Kunde inte nå SMS-tjänsten" };
  }
}

const STATUS_STYLE: Record<string, string> = {
  ny: "bg-slate-100 text-slate-600",
  skickat: "bg-sky-100 text-sky-700",
  svarat: "bg-violet-100 text-violet-700",
};

export default function CampaignPage() {
  const {
    loaded,
    recipients,
    settings,
    setSettings,
    markSent,
    setReply,
    update,
    importDobs,
    refresh,
  } = useCampaign();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!loaded) return <Loading />;

  const sent = recipients.filter((r) => r.sentAt).length;
  const awaiting = recipients.filter((r) => r.status === "skickat" && !r.reply).length;
  const booked = recipients.filter((r) => r.reply === "ja").length;
  const conv = sent ? Math.round((booked / sent) * 100) : 0;
  const stats = variantStats(recipients);
  const winner =
    stats[0].sent >= 3 && stats[1].sent >= 3
      ? stats[0].rate === stats[1].rate
        ? null
        : stats[0].rate > stats[1].rate
        ? "A"
        : "B"
      : null;

  async function doSend(r: Recipient, reminder = false) {
    setBusy(r.id);
    setStatus(null);
    const res = await sendSms(r.phone, messageFor(r, settings));
    if (!res.ok) {
      setStatus(`${r.name}: ${res.error}`);
    } else {
      markSent(r.id, reminder);
      setStatus(
        res.demo
          ? `Registrerat (demoläge – koppla SMS-tjänst för skarpt).`
          : `SMS skickat till ${r.name}.`
      );
    }
    setBusy(null);
  }

  async function sendAllPending() {
    const pending = recipients.filter((r) => r.status === "ny");
    for (const r of pending) await doSend(r);
  }

  async function sendAutoReply(r: Recipient) {
    setBusy(r.id);
    const res = await sendSms(r.phone, autoReply(r, settings));
    if (res.ok) update(r.id, { autoReplySent: true });
    setStatus(res.ok ? `Auto-svar skickat till ${r.name}.` : `Fel: ${res.error}`);
    setBusy(null);
  }

  const pendingCount = recipients.filter((r) => r.status === "ny").length;
  const reminderCount = recipients.filter((r) => needsReminder(r, settings)).length;

  return (
    <>
      <PageHeader
        title="SMS-kampanj – återbehandling"
        subtitle="Kalla in kunder för återbehandling av lackskydd, testa meddelanden och följ resultatet"
        action={
          <div className="flex gap-2">
            <button
              onClick={refresh}
              title="Hämta uppdateringar (t.ex. inkomna SMS-svar)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={15} /> Uppdatera
            </button>
            <button
              onClick={importDobs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={15} /> Importera DOBS-lista
            </button>
            <button
              onClick={sendAllPending}
              disabled={pendingCount === 0 || !!busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <Send size={15} /> Skicka alla väntande ({pendingCount})
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {status ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
            {status}
          </div>
        ) : null}

        {/* Översikt */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Mottagare" value={recipients.length} />
          <StatCard label="Skickade" value={sent} accent="text-sky-600" />
          <StatCard label="Väntar svar" value={awaiting} accent="text-amber-600" />
          <StatCard label="Bokade" value={booked} accent="text-emerald-600" />
          <StatCard label="Konvertering" value={`${conv}%`} accent="text-brand-600" />
        </div>

        {/* A/B-test */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Trophy size={16} /> A/B-test – vilket meddelande ger flest bokningar?
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div
                key={s.variant}
                className={`rounded-lg border p-4 ${
                  winner === s.variant
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    Variant {s.variant}
                    {winner === s.variant ? (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                        Bäst
                      </span>
                    ) : null}
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {Math.round(s.rate * 100)}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {s.booked} bokade av {s.sent} skickade
                </div>
              </div>
            ))}
          </div>
          {!winner ? (
            <p className="mt-2 text-xs text-slate-400">
              Skicka fler för ett säkert resultat – då markeras det vinnande meddelandet.
            </p>
          ) : null}
        </div>

        {/* Inställningar */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Inställningar (meddelanden, uppföljning, rabatt)
            <span className="text-xs text-slate-400">{settingsOpen ? "Dölj" : "Visa"}</span>
          </button>
          {settingsOpen ? (
            <div className="space-y-4 border-t border-slate-100 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Meddelande – Variant A
                  </label>
                  <textarea
                    value={settings.variantA}
                    onChange={(e) => setSettings({ ...settings, variantA: e.target.value })}
                    rows={5}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Meddelande – Variant B
                  </label>
                  <textarea
                    value={settings.variantB}
                    onChange={(e) => setSettings({ ...settings, variantB: e.target.value })}
                    rows={5}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Platshållare: <code>{"{fornamn}"}</code>, <code>{"{bil}"}</code>,{" "}
                <code>{"{regnr}"}</code>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  Påminnelse efter
                  <input
                    type="number"
                    min={1}
                    value={settings.reminderDays}
                    onChange={(e) =>
                      setSettings({ ...settings, reminderDays: Number(e.target.value) || 1 })
                    }
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  dagar
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  Max antal påminnelser
                  <input
                    type="number"
                    min={0}
                    value={settings.maxReminders}
                    onChange={(e) =>
                      setSettings({ ...settings, maxReminders: Number(e.target.value) || 0 })
                    }
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  Rabatt vid såld bil
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.soldDiscountPercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        soldDiscountPercent: Number(e.target.value) || 0,
                      })
                    }
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  %
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.priceAuto}
                    onChange={(e) => setSettings({ ...settings, priceAuto: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Auto-svar med pris
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {/* Mottagare */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Mottagare (månadslista från DOBS)
            </h2>
            {reminderCount > 0 ? (
              <span className="text-xs text-amber-600">
                {reminderCount} behöver påminnelse
              </span>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Kund</th>
                  <th className="px-4 py-2 font-medium">Bil</th>
                  <th className="px-4 py-2 font-medium">Storlek</th>
                  <th className="px-4 py-2 font-medium">Variant</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Svar</th>
                  <th className="px-4 py-2 font-medium">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <RecipientRow
                    key={r.id}
                    r={r}
                    busy={busy === r.id}
                    settings={settings}
                    onSend={() => doSend(r)}
                    onRemind={() => doSend(r, true)}
                    onReply={(rt) => setReply(r.id, rt)}
                    onClassify={(text) => setReply(r.id, classifyReply(text))}
                    onSendAuto={() => sendAutoReply(r)}
                    needsRem={needsReminder(r, settings)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Kundernas svar kommer i skarpt läge in via SMS-tjänstens webhook. Här registrerar
            du svaret manuellt för att se det automatiska svarsförslaget.
          </p>
        </div>
      </div>
    </>
  );
}

function RecipientRow({
  r,
  busy,
  settings,
  onSend,
  onRemind,
  onReply,
  onClassify,
  onSendAuto,
  needsRem,
}: {
  r: Recipient;
  busy: boolean;
  settings: ReturnType<typeof useCampaign>["settings"];
  onSend: () => void;
  onRemind: () => void;
  onReply: (rt: ReplyType) => void;
  onClassify: (text: string) => void;
  onSendAuto: () => void;
  needsRem: boolean;
}) {
  const auto = r.reply ? autoReply(r, settings) : "";
  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 align-top">
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800">{r.name}</div>
          <div className="text-xs text-slate-400">{r.phone}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-slate-700">{r.car}</div>
          <div className="text-xs text-slate-400">{r.regnr}</div>
        </td>
        <td className="px-4 py-3 text-slate-600">{SIZE_LABEL[recipientSize(r)]}</td>
        <td className="px-4 py-3">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
            {r.variant}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}
          >
            {r.status === "ny" ? "Ej skickat" : r.status === "skickat" ? "Skickat" : "Svarat"}
          </span>
        </td>
        <td className="px-4 py-3">
          <select
            value={r.reply ?? ""}
            onChange={(e) => e.target.value && onReply(e.target.value as ReplyType)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">— Registrera svar —</option>
            {(Object.keys(REPLY_LABEL) as ReplyType[]).map((rt) => (
              <option key={rt} value={rt}>
                {REPLY_LABEL[rt]}
              </option>
            ))}
          </select>
          <input
            placeholder="Klistra in kundens SMS…"
            title="Tolkas automatiskt till rätt svarstyp"
            onKeyDown={(e) => {
              const val = (e.target as HTMLInputElement).value.trim();
              if (e.key === "Enter" && val) {
                onClassify(val);
                (e.target as HTMLInputElement).value = "";
              }
            }}
            className="mt-1 w-40 rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:border-brand-500 focus:outline-none"
          />
        </td>
        <td className="px-4 py-3">
          {r.status === "ny" ? (
            <button
              onClick={onSend}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Skicka
            </button>
          ) : needsRem ? (
            <button
              onClick={onRemind}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Påminn
            </button>
          ) : (
            <span className="text-xs text-slate-400">–</span>
          )}
        </td>
      </tr>
      {r.reply && auto ? (
        <tr className="border-b border-slate-100 bg-violet-50/50">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <MessageSquare size={15} className="mt-0.5 shrink-0 text-violet-500" />
              <div className="flex-1">
                <div className="mb-1 text-xs font-semibold text-violet-700">
                  Auto-svar ({REPLY_LABEL[r.reply]}):
                </div>
                <div className="whitespace-pre-wrap text-sm text-slate-700">{auto}</div>
                <div className="mt-2">
                  {r.autoReplySent ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Check size={13} /> Auto-svar skickat
                    </span>
                  ) : (
                    <button
                      onClick={onSendAuto}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-40"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}{" "}
                      Skicka auto-svar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
