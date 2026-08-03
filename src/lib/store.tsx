"use client";

// Enkel state-hantering via React Context. Datan laddas på klienten vid mount
// (undviker hydration-krockar) och kan muteras: ändra status, markera
// uppföljning som skickad osv. I steg 2 byts generateLeads() mot riktiga
// mejl från Gmail API.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lead, Status } from "./types";
import { generateLeads } from "./sample-data";

interface LeadsContextValue {
  leads: Lead[];
  loaded: boolean;
  updateStatus: (id: string, status: Status) => void;
  markFollowUpSent: (id: string) => void;
  markAnswered: (id: string) => void;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLeads(generateLeads());
    setLoaded(true);
  }, []);

  const value = useMemo<LeadsContextValue>(
    () => ({
      leads,
      loaded,
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
    }),
    [leads, loaded]
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads måste användas inom LeadsProvider");
  return ctx;
}
