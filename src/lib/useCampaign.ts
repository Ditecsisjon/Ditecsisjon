"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  sampleDobsList,
  type CampaignSettings,
  type Recipient,
  type ReplyType,
} from "./campaign";

const REC_KEY = "ditec:campaign:recipients";
const SET_KEY = "ditec:campaign:settings";

export function useCampaign() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [settings, setSettings] = useState<CampaignSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem(REC_KEY);
      setRecipients(r ? JSON.parse(r) : sampleDobsList());
      const s = localStorage.getItem(SET_KEY);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
    } catch {
      setRecipients(sampleDobsList());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(REC_KEY, JSON.stringify(recipients));
  }, [recipients, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(SET_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  const update = useCallback((id: string, patch: Partial<Recipient>) => {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const markSent = useCallback((id: string, reminder = false) => {
    setRecipients((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "skickat",
              sentAt: new Date().toISOString(),
              remindersSent: reminder ? r.remindersSent + 1 : r.remindersSent,
            }
          : r
      )
    );
  }, []);

  const setReply = useCallback((id: string, reply: ReplyType) => {
    setRecipients((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "svarat", reply, replyAt: new Date().toISOString() }
          : r
      )
    );
  }, []);

  const importDobs = useCallback(() => setRecipients(sampleDobsList()), []);

  return {
    loaded,
    recipients,
    settings,
    setSettings,
    update,
    markSent,
    setReply,
    importDobs,
  };
}
