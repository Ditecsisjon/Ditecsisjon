"use client";

// Enkel state-hantering via React Context. Datan laddas på klienten vid mount
// (undviker hydration-krockar) och kan muteras: ändra status, markera
// uppföljning som skickad, läsa konversationer och skicka meddelanden.
// I steg 2 byts generateLeads() mot riktiga mejl från Gmail API.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  HistoryEntry,
  HistoryType,
  Lead,
  Message,
  ReminderConfig,
  Status,
  VehicleData,
} from "./types";
import { generateLeads } from "./sample-data";
import { leadKey } from "./leadMeta";

const HISTORY_LS_KEY = "ditec:history";
const REMINDER_LS_KEY = "ditec:reminders";
const HANDLED_LS_KEY = "ditec:handled";
const TEMPLATES_LS_KEY = "ditec:templates";
const VEHICLES_LS_KEY = "ditec:vehicles";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  }
}

interface LeadsContextValue {
  leads: Lead[];
  threads: Record<string, Message[]>;
  loaded: boolean;
  /** Var datan kommer ifrån just nu */
  source: "demo" | "mail";
  /** Pågår en mejlhämtning? */
  syncing: boolean;
  /** Senaste status/felmeddelande från mejlhämtningen */
  mailStatus: string | null;
  /** Statushistorik per ärende (nyckel = leadKey) */
  history: Record<string, HistoryEntry[]>;
  /** Automatiska påminnelser per ärende (nyckel = leadKey) */
  reminders: Record<string, ReminderConfig>;
  /** Manuellt markerade som hanterade (nyckel = leadKey) */
  handled: Record<string, boolean>;
  /** Egna svarsmallar (nyckel = ärendetyp eller tjänstenamn) */
  templates: Record<string, string>;
  /** Sparade fordonsuppgifter per ärende (nyckel = leadKey) */
  vehicles: Record<string, VehicleData>;
  updateStatus: (id: string, status: Status) => void;
  markFollowUpSent: (id: string) => void;
  markAnswered: (id: string) => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  sendMessage: (id: string, body: string, attachments?: string[]) => void;
  syncFromMail: () => Promise<void>;
  addHistory: (key: string, type: HistoryType, text: string) => void;
  setReminder: (key: string, config: ReminderConfig) => void;
  toggleHandled: (key: string) => void;
  setTemplate: (key: string, text: string) => void;
  setVehicle: (key: string, data: VehicleData) => void;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

/** Bygger den initiala tråden för ett ärende utifrån mejltexten. */
function buildInitialThread(lead: Lead): Message[] {
  const messages: Message[] = [
    { id: `${lead.id}-in-0`, direction: "in", body: lead.body, at: lead.receivedAt },
  ];

  // Om vi redan har svarat/skickat offert, visa ett tidigare utgående mejl
  const answered = ["besvarad", "offert_skickad", "bokad", "ingen_affar"].includes(
    lead.status
  );
  if (answered) {
    const service = lead.service ? lead.service.toLowerCase() : "ditt ärende";
    const first = lead.from.split(" ")[0];
    const body =
      lead.status === "offert_skickad" || lead.status === "bokad"
        ? `Hej ${first}!\n\nTack för din förfrågan. Bifogar vårt förslag och pris för ${service}. Hör av dig om du har några frågor så hjälper vi dig vidare.\n\nMvh\nDitec Sisjön`
        : `Hej ${first}!\n\nTack för din förfrågan. Skulle du kunna komma förbi med bilen så tittar vi på skicket och går igenom vilka alternativ som passar bäst. Därefter tar vi fram ett förslag och pris utifrån bilens behov.\n\nMvh\nDitec Sisjön`;
    messages.push({
      id: `${lead.id}-out-0`,
      direction: "out",
      body,
      at: lead.quoteSentAt ?? lead.lastContactAt ?? lead.receivedAt,
    });
  }

  return messages.sort((a, b) => +new Date(a.at) - +new Date(b.at));
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<"demo" | "mail">("demo");
  const [syncing, setSyncing] = useState(false);
  const [mailStatus, setMailStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [reminders, setReminders] = useState<Record<string, ReminderConfig>>({});
  const [handled, setHandled] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Record<string, VehicleData>>({});

  // Ladda sparad historik/påminnelser (överlever omstart via localStorage)
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_LS_KEY);
      if (h) setHistory(JSON.parse(h));
      const r = localStorage.getItem(REMINDER_LS_KEY);
      if (r) setReminders(JSON.parse(r));
      const hd = localStorage.getItem(HANDLED_LS_KEY);
      if (hd) setHandled(JSON.parse(hd));
      const t = localStorage.getItem(TEMPLATES_LS_KEY);
      if (t) setTemplates(JSON.parse(t));
      const v = localStorage.getItem(VEHICLES_LS_KEY);
      if (v) setVehicles(JSON.parse(v));
    } catch {
      /* ignorera trasig localStorage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATES_LS_KEY, JSON.stringify(templates));
    } catch {
      /* ignorera */
    }
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem(HANDLED_LS_KEY, JSON.stringify(handled));
    } catch {
      /* ignorera */
    }
  }, [handled]);

  useEffect(() => {
    try {
      localStorage.setItem(VEHICLES_LS_KEY, JSON.stringify(vehicles));
    } catch {
      /* ignorera */
    }
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_LS_KEY, JSON.stringify(history));
    } catch {
      /* full/blockerad localStorage – ignorera */
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(REMINDER_LS_KEY, JSON.stringify(reminders));
    } catch {
      /* ignorera */
    }
  }, [reminders]);

  function addHistoryEntry(key: string, type: HistoryType, text: string) {
    setHistory((prev) => ({
      ...prev,
      [key]: [
        { id: newId(), type, text, at: new Date().toISOString() },
        ...(prev[key] ?? []),
      ],
    }));
  }

  async function syncFromMail() {
    setSyncing(true);
    setMailStatus(null);
    try {
      const res = await fetch("/api/mail/sync");
      const data = await res.json();
      if (!data.configured) {
        setMailStatus("Demoläge – koppla IMAP i .env.local för riktiga mejl.");
        return;
      }
      if (data.error) {
        setMailStatus(`Kunde inte hämta mejl: ${data.error}`);
        return;
      }
      const mailLeads: Lead[] = (data.leads ?? []).map((l: Lead) => ({
        ...l,
        unread: l.unread ?? (l.status === "ny" || l.status === "obesvarad"),
      }));
      setLeads(mailLeads);
      setThreads(data.threads ?? {});
      setSource("mail");
      setMailStatus(`Hämtade ${mailLeads.length} mejl från ${data.account ?? "brevlådan"}.`);
    } catch {
      setMailStatus("Kunde inte nå mejlservern.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    // Visa demodata direkt
    const data = generateLeads().map((lead) => ({
      ...lead,
      unread: lead.unread ?? (lead.status === "ny" || lead.status === "obesvarad"),
    }));
    const initThreads: Record<string, Message[]> = {};
    for (const lead of data) initThreads[lead.id] = buildInitialThread(lead);
    setLeads(data);
    setThreads(initThreads);
    setLoaded(true);
    // Försök hämta riktiga mejl i bakgrunden (byter ut demodatan om det lyckas)
    syncFromMail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-skicka förfallna påminnelser (endast skarpt läge med riktig brevlåda)
  const processingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (source !== "mail" || !loaded) return;
    (async () => {
      for (const lead of leads) {
        const key = leadKey(lead);
        const r = reminders[key];
        if (!r?.enabled || processingRef.current.has(key)) continue;
        // Bara obesvarade/skickade offerter – inte bokade eller avslutade
        if (!["ny", "obesvarad", "besvarad", "offert_skickad"].includes(lead.status)) continue;
        const base = lead.quoteSentAt || lead.lastContactAt || lead.receivedAt;
        const dueAt = new Date(base);
        dueAt.setDate(dueAt.getDate() + (r.daysAfter || 3));
        if (Date.now() < dueAt.getTime()) continue;
        if (r.lastSentAt && new Date(r.lastSentAt).getTime() >= dueAt.getTime()) continue;

        processingRef.current.add(key);
        try {
          const res = await fetch("/api/mail/send", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              to: lead.email,
              subject: `Påminnelse: ${lead.subject}`,
              body: r.text,
            }),
          });
          const data = await res.json();
          if (data.sent) {
            addHistoryEntry(key, "mejl", "Automatisk påminnelse skickad");
            setReminders((prev) => ({
              ...prev,
              [key]: { ...prev[key], lastSentAt: new Date().toISOString() },
            }));
            setLeads((prev) =>
              prev.map((l) =>
                l.id === lead.id
                  ? { ...l, lastContactAt: new Date().toISOString(), followUpsSent: l.followUpsSent + 1 }
                  : l
              )
            );
          } else {
            processingRef.current.delete(key); // ej skickat (t.ex. SMTP saknas) – försök igen senare
          }
        } catch {
          processingRef.current.delete(key);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, loaded, leads, reminders]);

  const value = useMemo<LeadsContextValue>(
    () => ({
      leads,
      threads,
      loaded,
      source,
      syncing,
      mailStatus,
      history,
      reminders,
      handled,
      templates,
      vehicles,
      syncFromMail,
      addHistory: addHistoryEntry,
      setReminder: (key, config) =>
        setReminders((prev) => ({ ...prev, [key]: config })),
      toggleHandled: (key) =>
        setHandled((prev) => ({ ...prev, [key]: !prev[key] })),
      setTemplate: (key, text) =>
        setTemplates((prev) => ({ ...prev, [key]: text })),
      setVehicle: (key, data) =>
        setVehicles((prev) => ({ ...prev, [key]: data })),
      updateStatus: (id, status) =>
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, status, lastContactAt: new Date().toISOString() }
              : l
          )
        ),
      markFollowUpSent: (id) =>
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  followUpsSent: l.followUpsSent + 1,
                  lastContactAt: new Date().toISOString(),
                }
              : l
          )
        ),
      markAnswered: (id) =>
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id && (l.status === "ny" || l.status === "obesvarad")
              ? { ...l, status: "besvarad", lastContactAt: new Date().toISOString() }
              : l
          )
        ),
      markRead: (id) =>
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, unread: false } : l))
        ),
      markUnread: (id) =>
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, unread: true } : l))
        ),
      sendMessage: (id, body, attachments) => {
        const at = new Date().toISOString();
        setThreads((prev) => ({
          ...prev,
          [id]: [
            ...(prev[id] ?? []),
            {
              id: `${id}-out-${(prev[id]?.length ?? 0)}`,
              direction: "out",
              body,
              at,
              attachments: attachments?.length ? attachments : undefined,
            },
          ],
        }));
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  unread: false,
                  lastContactAt: at,
                  status: l.status === "ny" || l.status === "obesvarad" ? "besvarad" : l.status,
                }
              : l
          )
        );
        // Logga i statushistoriken
        const lead = leads.find((l) => l.id === id);
        if (lead) {
          const snippet = body.replace(/\s+/g, " ").slice(0, 60);
          addHistoryEntry(leadKey(lead), "mejl", snippet ? `Mejl skickat: ${snippet}…` : "Mejl skickat");
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, threads, loaded, source, syncing, mailStatus, history, reminders, handled, templates, vehicles]
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads måste användas inom LeadsProvider");
  return ctx;
}
