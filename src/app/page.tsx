"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Check,
  Paperclip,
  Plus,
  Star,
  Archive,
  ChevronDown,
  Smile,
  X,
  RefreshCw,
  Bell,
  History,
  Wand2,
  Phone,
  MessageSquare,
  Mail,
  StickyNote,
  CircleCheck,
  MailOpen,
  Calculator,
  Loader2,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import { useLeads } from "@/lib/store";
import {
  HISTORY_LABELS,
  type Category,
  type HistoryEntry,
  type HistoryType,
  type Lead,
  type Message,
  type ReminderConfig,
} from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/format";
import {
  findRegnrInText,
  isValidRegnr,
  normalizeRegnr,
  transportstyrelsenUrl,
  biluppgifterUrl,
  type VehicleInfo,
} from "@/lib/vehicle";
import { leadKey, customerResponded } from "@/lib/leadMeta";
import { suggestReply, defaultReminderText } from "@/lib/suggest";
import {
  TREATMENTS,
  SIZE_ORDER,
  SIZE_LABEL,
  SIZE_EXAMPLE,
  sizeFromLengthMm,
  suggestedTreatmentKeys,
  formatAmount as formatSek,
  type CarSize,
} from "@/lib/pricing";
import { parseRequestedTime, toLocalInput, formatSlot, type SlotResult } from "@/lib/planner";
import { Loading } from "@/components/ui";

const INTENT_PHRASE: Record<Category, string> = {
  offert: "offert förfrågan",
  bokning: "boka tid",
  konsultation: "fråga / konsultation",
  ovrigt: "övrigt",
};

// Avataren visar ärendets initialer och färg. Ljus = väntar på svar,
// mörkare + svart ring = kunden har svarat.
const CATEGORY_AVATAR: Record<
  Category,
  { initials: string; light: string; dark: string }
> = {
  offert: { initials: "OF", light: "bg-yellow-200 text-yellow-800", dark: "bg-yellow-400 text-yellow-950" },
  bokning: { initials: "BT", light: "bg-green-200 text-green-800", dark: "bg-green-600 text-white" },
  konsultation: { initials: "KO", light: "bg-violet-200 text-violet-800", dark: "bg-violet-500 text-white" },
  ovrigt: { initials: "ÖV", light: "bg-slate-200 text-slate-600", dark: "bg-slate-500 text-white" },
};

function CategoryAvatar({
  category,
  responded,
  small,
}: {
  category: Category;
  responded: boolean;
  small?: boolean;
}) {
  const c = CATEGORY_AVATAR[category];
  const dim = small ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";
  const state = responded
    ? `${c.dark} ring-[3px] ring-black ring-offset-1`
    : c.light;
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full font-bold ${state}`}
      title={`${INTENT_PHRASE[category]}${responded ? " – kunden har svarat" : ""}`}
    >
      {c.initials}
    </div>
  );
}

// Filter för konversationslistan – låter dig fokusera på affärer och gömma brus.
const FILTERS: { key: string; label: string; test: (l: Lead) => boolean }[] = [
  { key: "affarer", label: "Affärer (dölj övrigt)", test: (l) => l.category !== "ovrigt" },
  { key: "alla", label: "Alla konversationer", test: () => true },
  { key: "obesvarade", label: "Obesvarade", test: (l) => l.status === "ny" || l.status === "obesvarad" },
  { key: "offert", label: "Offerter", test: (l) => l.category === "offert" },
  { key: "bokning", label: "Bokningar", test: (l) => l.category === "bokning" },
  { key: "konsultation", label: "Konsultation", test: (l) => l.category === "konsultation" },
  { key: "ovrigt", label: "Endast övrigt", test: (l) => l.category === "ovrigt" },
];

export default function InboxPage() {
  const { leads, threads, loaded, markRead, syncFromMail, syncing, source, mailStatus, handled } =
    useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState<string>("affarer");
  const [filterOpen, setFilterOpen] = useState(false);

  const currentFilter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[1];

  const sorted = useMemo(
    () => [...leads].sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt)),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return sorted.filter((l) => {
      if (!currentFilter.test(l)) return false;
      if (!q) return true;
      return `${l.from} ${l.email} ${l.subject} ${l.body} ${l.service ?? ""} ${l.regnr ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [sorted, query, currentFilter]);

  // Välj första konversationen som standard
  useEffect(() => {
    if (loaded && !selectedId && sorted.length) setSelectedId(sorted[0].id);
  }, [loaded, selectedId, sorted]);

  if (!loaded) return <Loading />;

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  function openConversation(id: string) {
    setSelectedId(id);
    markRead(id);
  }

  return (
    <div className="flex h-full flex-col">
      <VehicleBar lead={selected} />

      <div className="flex min-h-0 flex-1">
        {/* Konversationslista */}
        <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök regnr, namn, e-post…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 hover:bg-slate-100"
            >
              {currentFilter.label}
              <ChevronDown size={15} className="text-slate-400" />
            </button>
            {filterKey !== "alla" ? (
              <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                {filtered.length}
              </span>
            ) : null}
            <button
              onClick={() => syncFromMail()}
              disabled={syncing}
              title={
                source === "mail"
                  ? "Hämta nya mejl"
                  : "Hämta mejl från din brevlåda (kräver IMAP-koppling)"
              }
              className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            </button>

            {filterOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                <div className="absolute left-3 top-11 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setFilterKey(f.key);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                        f.key === filterKey
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {f.label}
                      <span className="text-xs text-slate-400">
                        {leads.filter(f.test).length}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          {mailStatus ? (
            <div
              className={`border-b px-4 py-1.5 text-[11px] ${
                source === "mail"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
            >
              {mailStatus}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto thin-scroll">
            {filtered.map((lead) => (
              <ConversationItem
                key={lead.id}
                lead={lead}
                active={lead.id === selectedId}
                responded={
                  customerResponded(lead, threads[lead.id]) || !!handled[leadKey(lead)]
                }
                onClick={() => openConversation(lead.id)}
              />
            ))}
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Inga träffar.</div>
            ) : null}
          </div>
        </div>

        {/* Konversation */}
        {selected ? (
          <ConversationView
            key={selected.id}
            lead={selected}
            messages={threads[selected.id] ?? []}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Välj en konversation
          </div>
        )}
      </div>
    </div>
  );
}

// --- Fordonsrad högst upp ---------------------------------------------------

function VehicleBar({ lead }: { lead: Lead | null }) {
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const regnr = lead?.regnr ?? (lead ? findRegnrInText(lead.body) : null);

  useEffect(() => {
    let cancelled = false;
    setVehicle(null);
    if (!regnr || !isValidRegnr(regnr)) return;
    setLoading(true);
    fetch(`/api/vehicle?regnr=${encodeURIComponent(normalizeRegnr(regnr))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d.error) setVehicle(d as VehicleInfo);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [regnr]);

  const km = vehicle?.mileageMil != null ? vehicle.mileageMil * 10 : undefined;
  const badge =
    vehicle?.source === "demo"
      ? { text: "demo", cls: "bg-slate-100 text-slate-400" }
      : vehicle?.source === "scrape" || vehicle?.source === "api"
      ? { text: "Transportstyrelsen", cls: "bg-emerald-100 text-emerald-700" }
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-slate-200 bg-white px-6 py-3 text-sm">
      <span className="flex items-center gap-2 font-bold text-slate-900">
        Biluppgifter på vald offert.
        {badge ? (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-normal ${badge.cls}`}>
            {badge.text}
          </span>
        ) : null}
      </span>
      {loading ? (
        <span className="text-slate-400">Hämtar fordonsuppgifter…</span>
      ) : vehicle ? (
        <>
          <BarField label="Regnr" value={vehicle.regnr} />
          <BarField label="Bilmärke" value={`${vehicle.brand} ${vehicle.model}`.toUpperCase()} />
          <BarField label="Årsmodell" value={String(vehicle.modelYear)} />
          <BarField
            label="Mätarställning"
            value={km != null ? `${new Intl.NumberFormat("sv-SE").format(km)} km` : "–"}
          />
          <BarField label="Färg" value={vehicle.color.toUpperCase()} />
          {vehicle.lengthMm ? (
            <BarField
              label="Längd"
              value={`${new Intl.NumberFormat("sv-SE").format(vehicle.lengthMm)} mm`}
            />
          ) : null}
        </>
      ) : (
        <span className="text-slate-400">Ingen bil kopplad till detta ärende.</span>
      )}
      {regnr && isValidRegnr(regnr) ? (
        <span className="flex items-center gap-3 text-xs">
          <a
            href={transportstyrelsenUrl(regnr)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            title="Öppna Transportstyrelsens gratis fordonsuppslag"
          >
            <ExternalLink size={12} /> Transportstyrelsen
          </a>
          <a
            href={biluppgifterUrl(regnr)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            title="Öppna biluppgifter.se"
          >
            <ExternalLink size={12} /> biluppgifter.se
          </a>
        </span>
      ) : null}
    </div>
  );
}

function BarField({ label, value }: { label: string; value: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}: </span>
      <span className="font-bold text-slate-900">{value}</span>
    </span>
  );
}

// --- Konversationsrad i listan ----------------------------------------------

function ConversationItem({
  lead,
  active,
  responded,
  onClick,
}: {
  lead: Lead;
  active: boolean;
  responded: boolean;
  onClick: () => void;
}) {
  const unread = !!lead.unread;
  return (
    <button
      onClick={onClick}
      className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${
        active ? "bg-brand-50" : "hover:bg-slate-50"
      }`}
    >
      <CategoryAvatar category={lead.category} responded={responded} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm ${
              unread ? "font-bold text-slate-900" : "font-medium text-slate-700"
            }`}
          >
            {lead.from}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {new Date(lead.receivedAt).toLocaleDateString("sv-SE", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <div
          className={`truncate text-sm ${
            unread ? "font-bold text-slate-900" : "text-slate-500"
          }`}
        >
          {INTENT_PHRASE[lead.category]}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-slate-400">
            {lead.service ?? lead.subject}
          </span>
          {unread ? (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
              1
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// --- Konversationsvy (tråd + skrivruta) -------------------------------------

function ConversationView({ lead, messages }: { lead: Lead; messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { history, reminders, handled, addHistory, setReminder, toggleHandled, markUnread } =
    useLeads();
  const [panel, setPanel] = useState<
    null | "historik" | "paminnelse" | "pris" | "tid"
  >(null);
  const [reply, setReply] = useState("");

  const key = leadKey(lead);
  const entries = history[key] ?? [];
  const reminder = reminders[key];
  const isHandled = !!handled[key];
  const responded = customerResponded(lead, messages) || isHandled;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <CategoryAvatar category={lead.category} responded={responded} small />
          <div>
            <div className="font-semibold text-slate-900">{lead.from}</div>
            <span className="text-xs text-slate-400">{lead.email}</span>
          </div>
        </div>
        <div className="relative flex items-center gap-1 text-slate-400">
          <IconBtn
            title="Statushistorik – hur ärendet hanterats"
            active={panel === "historik"}
            onClick={() => setPanel((p) => (p === "historik" ? null : "historik"))}
          >
            <History size={18} />
            {entries.length ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-500 px-1 text-[9px] font-semibold text-white">
                {entries.length}
              </span>
            ) : null}
          </IconBtn>
          <IconBtn
            title="Priskonfigurator – förslag & pris efter bilstorlek"
            active={panel === "pris"}
            onClick={() => setPanel((p) => (p === "pris" ? null : "pris"))}
          >
            <Calculator size={18} />
          </IconBtn>
          <IconBtn
            title="Tidsbokning – kolla tillgänglighet"
            active={panel === "tid"}
            onClick={() => setPanel((p) => (p === "tid" ? null : "tid"))}
          >
            <CalendarClock size={18} />
          </IconBtn>
          <IconBtn
            title="Automatisk påminnelse"
            active={panel === "paminnelse"}
            onClick={() => setPanel((p) => (p === "paminnelse" ? null : "paminnelse"))}
          >
            <Bell size={18} />
            {reminder?.enabled ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
            ) : null}
          </IconBtn>
          <IconBtn
            title={
              isHandled
                ? "Hanterad – klicka för att ångra"
                : "Markera som hanterad / kund har svarat"
            }
            active={isHandled}
            onClick={() => toggleHandled(key)}
          >
            <CircleCheck size={18} className={isHandled ? "text-emerald-600" : ""} />
          </IconBtn>
          <IconBtn title="Markera som oläst" onClick={() => markUnread(lead.id)}>
            <MailOpen size={18} />
          </IconBtn>
          <IconBtn title="Stjärnmärk">
            <Star size={18} />
          </IconBtn>
          <IconBtn title="Arkivera">
            <Archive size={18} />
          </IconBtn>

          {panel === "historik" ? (
            <HistoryPanel
              entries={entries}
              onAdd={(type, text) => addHistory(key, type, text)}
              onClose={() => setPanel(null)}
            />
          ) : null}
          {panel === "paminnelse" ? (
            <ReminderPanel
              lead={lead}
              reminder={reminder}
              onSave={(cfg) => {
                setReminder(key, cfg);
                setPanel(null);
              }}
              onClose={() => setPanel(null)}
            />
          ) : null}
          {panel === "pris" ? (
            <PriceConfigurator
              lead={lead}
              onInsert={(text) => {
                setReply((p) => (p ? `${p}\n\n${text}` : text));
                setPanel(null);
              }}
              onClose={() => setPanel(null)}
            />
          ) : null}
          {panel === "tid" ? (
            <BookingPanel
              lead={lead}
              onInsert={(text) => {
                setReply((p) => (p ? `${p}\n\n${text}` : text));
                setPanel(null);
              }}
              onClose={() => setPanel(null)}
            />
          ) : null}
        </div>
      </div>

      {/* Tråd */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 thin-scroll">
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} lead={lead} />
          ))}
        </div>
      </div>

      {/* Skrivruta */}
      <Composer lead={lead} body={reply} setBody={setReply} />
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`relative rounded-lg p-2 hover:bg-slate-100 hover:text-slate-600 ${
        active ? "bg-slate-100 text-slate-700" : ""
      }`}
    >
      {children}
    </button>
  );
}

const HISTORY_ICON: Record<HistoryType, typeof Phone> = {
  ringt: Phone,
  sms: MessageSquare,
  mejl: Mail,
  anteckning: StickyNote,
  status: Check,
};

function HistoryPanel({
  entries,
  onAdd,
  onClose,
}: {
  entries: HistoryEntry[];
  onAdd: (type: HistoryType, text: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const quick: { type: HistoryType; label: string; icon: typeof Phone; text: string }[] = [
    { type: "ringt", label: "Ringt upp", icon: Phone, text: "Ringde upp kunden" },
    { type: "sms", label: "SMS", icon: MessageSquare, text: "Skickade SMS" },
    { type: "mejl", label: "Mejl", icon: Mail, text: "Kontaktade via mejl" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">Status &amp; historik</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-slate-100 p-3">
          <div className="mb-2 flex gap-1.5">
            {quick.map((q) => (
              <button
                key={q.type}
                onClick={() => onAdd(q.type, q.text)}
                className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-200 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <q.icon size={16} /> {q.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && note.trim()) {
                  onAdd("anteckning", note.trim());
                  setNote("");
                }
              }}
              placeholder="Skriv en anteckning…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (note.trim()) {
                  onAdd("anteckning", note.trim());
                  setNote("");
                }
              }}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
            >
              Lägg till
            </button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto thin-scroll p-3">
          {entries.length ? (
            <ol className="space-y-3">
              {entries.map((e) => {
                const Icon = HISTORY_ICON[e.type];
                return (
                  <li key={e.id} className="flex gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-800">{e.text}</div>
                      <div className="text-[11px] text-slate-400">
                        {HISTORY_LABELS[e.type]} · {formatRelativeTime(e.at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">
              Ingen historik än. Logga första kontakten ovan.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ReminderPanel({
  lead,
  reminder,
  onSave,
  onClose,
}: {
  lead: Lead;
  reminder?: ReminderConfig;
  onSave: (cfg: ReminderConfig) => void;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(reminder?.enabled ?? false);
  const [days, setDays] = useState(reminder?.daysAfter ?? 3);
  const [text, setText] = useState(reminder?.text ?? defaultReminderText(lead));

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-11 z-30 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Bell size={15} /> Automatisk påminnelse
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Aktivera automatisk påminnelse för denna offert
          </label>

          <div className="flex items-center gap-2 text-sm text-slate-700">
            Skicka efter
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
            />
            dagar utan svar
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Meddelande (egen text)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Skickas automatiskt en gång när offerten varit obesvarad angivet antal dagar
            (medan appen är igång och e-post är kopplad).
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Avbryt
            </button>
            <button
              onClick={() =>
                onSave({ enabled, daysAfter: days, text, lastSentAt: reminder?.lastSentAt })
              }
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Spara
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PriceConfigurator({
  lead,
  onInsert,
  onClose,
}: {
  lead: Lead;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const regnr = lead.regnr ?? findRegnrInText(lead.body) ?? "";
  const [size, setSize] = useState<CarSize>("mellan");
  const [autoSize, setAutoSize] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestedTreatmentKeys(lead))
  );

  useEffect(() => {
    let cancelled = false;
    if (!regnr || !isValidRegnr(regnr)) return;
    setLoading(true);
    fetch(`/api/vehicle?regnr=${encodeURIComponent(normalizeRegnr(regnr))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d.error) {
          setVehicle(d as VehicleInfo);
          if (autoSize) setSize(sizeFromLengthMm((d as VehicleInfo).lengthMm));
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(k: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  const chosen = TREATMENTS.filter((t) => selected.has(t.key));
  const total = chosen.reduce((s, t) => s + t.prices[size], 0);

  function insert() {
    const carLine = vehicle ? `${vehicle.brand} ${vehicle.model}` : "din bil";
    const lines = chosen.map((t) => `• ${t.name} – ${formatSek(t.prices[size])}`).join("\n");
    const text = `Prisförslag för ${carLine} (storlek: ${SIZE_LABEL[size]}):\n${lines}\n\nTotalt: ${formatSek(
      total
    )}\n\nPriserna är preliminära och kan justeras något efter bilens skick. Välkommen att boka en tid!`;
    onInsert(text);
  }

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-11 z-30 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Calculator size={15} /> Priskonfigurator
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Bil + storlek */}
        <div className="border-b border-slate-100 p-3">
          <div className="mb-1 text-xs text-slate-500">
            {loading
              ? "Hämtar bilstorlek…"
              : vehicle
              ? `${vehicle.brand} ${vehicle.model}${
                  vehicle.lengthMm ? ` · ${vehicle.lengthMm} mm` : ""
                }`
              : "Ingen bil kopplad – välj storlek manuellt"}
          </div>
          <select
            value={size}
            onChange={(e) => {
              setSize(e.target.value as CarSize);
              setAutoSize(false);
            }}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            {SIZE_ORDER.map((s) => (
              <option key={s} value={s}>
                {SIZE_LABEL[s]} ({SIZE_EXAMPLE[s]})
              </option>
            ))}
          </select>
        </div>

        {/* Behandlingar */}
        <div className="max-h-72 overflow-y-auto thin-scroll p-2">
          {TREATMENTS.map((t) => {
            const on = selected.has(t.key);
            return (
              <label
                key={t.key}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 ${
                  on ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(t.key)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{t.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatSek(t.prices[size])}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">{t.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        {/* Summa + infoga */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-sm text-slate-500">
            Totalt: <span className="font-semibold text-slate-900">{formatSek(total)}</span>
          </span>
          <button
            onClick={insert}
            disabled={chosen.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            Infoga i svaret
          </button>
        </div>
      </div>
    </>
  );
}

interface PlannerResult {
  source: string;
  competenceLabel?: string;
  requested: {
    available: boolean;
    technician?: string;
    dateLabel: string;
    slotLabel: string;
  };
  suggestions: SlotResult[];
}

function BookingPanel({
  lead,
  onInsert,
  onClose,
}: {
  lead: Lead;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const [when, setWhen] = useState<string>(() => toLocalInput(parseRequestedTime(lead.body)));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlannerResult | null>(null);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      const iso = new Date(when).toISOString();
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedISO: iso, service: lead.service }),
      });
      setResult(await res.json());
    } catch {
      /* ignorera */
    } finally {
      setLoading(false);
    }
  }

  const first = lead.from.split(" ")[0];

  function insertConfirm() {
    if (!result) return;
    const r = result.requested;
    const text = `Hej ${first}!\n\nDin önskade tid (${r.dateLabel} kl ${r.slotLabel}) är ledig – vi bokar in dig då${
      r.technician ? ` (hos ${r.technician})` : ""
    }. Välkommen!\n\nVänliga hälsningar,\nDitec Sisjön`;
    onInsert(text);
  }

  function insertSuggestions() {
    if (!result) return;
    const lines = result.suggestions.map((s) => `• ${formatSlot(s)}`).join("\n");
    const text = `Hej ${first}!\n\nTyvärr är din önskade tid redan bokad. Vi kan istället erbjuda:\n${lines}\n\nVilken tid passar dig bäst, så bokar vi in dig direkt?\n\nVänliga hälsningar,\nDitec Sisjön`;
    onInsert(text);
  }

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-11 z-30 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <CalendarClock size={15} /> Tidsbokning
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="text-xs text-slate-500">
            Tjänst: <span className="font-medium text-slate-700">{lead.service ?? "–"}</span>
            {result?.competenceLabel ? (
              <>
                {" "}· kräver{" "}
                <span className="font-medium text-slate-700">{result.competenceLabel}</span>
              </>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Önskad tid</label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <button
            onClick={check}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />}
            Kontrollera tillgänglighet
          </button>

          {result ? (
            result.requested.available ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-sm font-medium text-emerald-800">
                  ✓ Ledigt {result.requested.dateLabel} kl {result.requested.slotLabel}
                  {result.requested.technician ? ` (${result.requested.technician})` : ""}
                </div>
                <button
                  onClick={insertConfirm}
                  className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Infoga bekräftelse i svaret
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="text-sm font-medium text-rose-800">
                  Upptaget {result.requested.dateLabel} kl {result.requested.slotLabel}
                </div>
                {result.suggestions.length ? (
                  <>
                    <div className="mt-2 text-xs font-medium text-slate-600">
                      Föreslagna tider:
                    </div>
                    <ul className="mt-1 space-y-1">
                      {result.suggestions.map((s) => (
                        <li key={s.startISO} className="text-xs text-slate-700">
                          • {formatSlot(s)}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={insertSuggestions}
                      className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Infoga förslag i svaret
                    </button>
                  </>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">Inga lediga tider hittades.</div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message, lead }: { message: Message; lead: Lead }) {
  const isOut = message.direction === "out";
  return (
    <div>
      <div className="mb-1 text-center text-xs text-slate-400">
        {formatDate(message.at)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-slate-900">
          {isOut ? "Ditec Sisjön" : lead.from}
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {message.body}
        </div>
        {message.attachments?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
              >
                <Paperclip size={13} /> {a}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-xs text-slate-400">
          <Check size={13} /> {isOut ? "Skickat via mejl" : "E-post"}
        </div>
      </div>
    </div>
  );
}

// --- Skrivruta med bifogning ------------------------------------------------

function Composer({
  lead,
  body,
  setBody,
}: {
  lead: Lead;
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { sendMessage, templates } = useLeads();
  const [subject, setSubject] = useState(`Re: ${lead.subject}`);
  const [files, setFiles] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((f) => f.name);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  }

  async function fetchVehicle(): Promise<VehicleInfo | null> {
    const rn = lead.regnr ?? findRegnrInText(lead.body) ?? "";
    if (!rn || !isValidRegnr(rn)) return null;
    try {
      const res = await fetch(`/api/vehicle?regnr=${encodeURIComponent(normalizeRegnr(rn))}`);
      const d = await res.json();
      return d.error ? null : (d as VehicleInfo);
    } catch {
      return null;
    }
  }

  // Snabbt mallförslag (med bildata ifylld)
  async function fillSuggestion() {
    setSuggesting(true);
    setStatus(null);
    const v = await fetchVehicle();
    setBody(suggestReply(lead, templates, v));
    setSuggesting(false);
  }

  async function send() {
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    setStatus(null);
    const text =
      body.trim() + (files.length ? `\n\n(Bifogade filer: ${files.join(", ")})` : "");
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: lead.email, subject, body: text }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus(`Kunde inte skicka: ${data.error}`);
        return;
      }
      // Skickat via SMTP, eller demoläge (inget SMTP konfigurerat)
      sendMessage(lead.id, body.trim(), files);
      setBody("");
      setFiles([]);
      setStatus(
        data.sent ? "Mejl skickat till kunden." : "Registrerat (demoläge – SMTP ej kopplat)."
      );
    } catch {
      setStatus("Kunde inte nå mejlservern.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white px-6 py-3">
      <div className="rounded-xl border border-slate-200">
        {/* Rubrikrad */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2 text-sm">
          <span className="flex items-center gap-1 text-slate-500">
            Meddela via:
            <span className="flex items-center gap-1 font-medium text-brand-600">
              E-post <ChevronDown size={13} />
            </span>
          </span>
          <span className="text-slate-500">
            Till: <span className="text-slate-700">{lead.email}</span>
          </span>
        </div>
        <div className="border-b border-slate-100 px-4 py-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-sm text-slate-700 focus:outline-none"
            placeholder="Ämne"
          />
        </div>

        {/* Meddelandetext */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Skriv ditt meddelande…"
          className="w-full resize-none px-4 py-3 text-sm text-slate-700 focus:outline-none"
        />

        {/* Bifogade filer */}
        {files.length ? (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {files.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
              >
                <Paperclip size={13} /> {f}
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {/* Verktygsrad */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <div className="flex items-center gap-1 text-slate-400">
            <button
              title="Snabbt mallförslag (fyller i namn, tjänst och bil)"
              onClick={fillSuggestion}
              disabled={suggesting}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
            >
              {suggesting ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={17} />}
              Förslag
            </button>
            <IconBtn title="Lägg till">
              <Plus size={18} />
            </IconBtn>
            <button
              title="Bifoga fil"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg p-2 hover:bg-slate-100 hover:text-slate-600"
            >
              <Paperclip size={18} />
            </button>
            <IconBtn title="Emoji">
              <Smile size={18} />
            </IconBtn>
            <input ref={fileRef} type="file" multiple hidden onChange={onPick} />
          </div>
          <div className="flex items-center gap-3">
            {status ? (
              <span className="text-xs text-slate-400">{status}</span>
            ) : null}
            <button
              onClick={send}
              disabled={sending || (!body.trim() && files.length === 0)}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "Skickar…" : "Skicka mejl"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
