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
  useState,
  type ReactNode,
} from "react";
import type { Lead, Message, Status } from "./types";
import { generateLeads } from "./sample-data";

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
  updateStatus: (id: string, status: Status) => void;
  markFollowUpSent: (id: string) => void;
  markAnswered: (id: string) => void;
  markRead: (id: string) => void;
  sendMessage: (id: string, body: string, attachments?: string[]) => void;
  syncFromMail: () => Promise<void>;
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

  const value = useMemo<LeadsContextValue>(
    () => ({
      leads,
      threads,
      loaded,
      source,
      syncing,
      mailStatus,
      syncFromMail,
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
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, threads, loaded, source, syncing, mailStatus]
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads måste användas inom LeadsProvider");
  return ctx;
}
