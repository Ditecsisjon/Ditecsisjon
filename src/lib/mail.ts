// Server-sida: hämtar riktiga mejl från en IMAP-brevlåda (t.ex. Websupport)
// och omvandlar dem till Lead-objekt som appen kan visa. Körs bara på servern
// (aldrig i webbläsaren) eftersom det använder nätverk och lösenord.

import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { Lead, Message } from "./types";
import { classifyByRules } from "./classifier";
import { findRegnrInText } from "./vehicle";

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  mailbox: string;
  limit: number;
}

/** Läser IMAP-inställningar från miljövariabler. Returnerar null om ofullständigt. */
export function readMailConfig(): MailConfig | null {
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;
  if (!user || !pass) return null;
  return {
    host: process.env.IMAP_HOST || "imap.websupport.se",
    port: Number(process.env.IMAP_PORT || 993),
    secure: (process.env.IMAP_SECURE ?? "true") !== "false",
    user,
    pass,
    mailbox: process.env.IMAP_MAILBOX || "INBOX",
    limit: Number(process.env.MAIL_FETCH_LIMIT || 40),
  };
}

export interface SyncResult {
  leads: Lead[];
  threads: Record<string, Message[]>;
}

/** Ansluter, hämtar de senaste mejlen och klassificerar dem. */
export async function fetchLeadsFromImap(config: MailConfig): Promise<SyncResult> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    logger: false,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  const leads: Lead[] = [];
  const threads: Record<string, Message[]> = {};

  await client.connect();
  const lock = await client.getMailboxLock(config.mailbox);
  try {
    const total = client.mailbox && typeof client.mailbox !== "boolean"
      ? client.mailbox.exists
      : 0;
    if (total > 0) {
      const start = Math.max(1, total - config.limit + 1);
      for await (const msg of client.fetch(`${start}:*`, {
        envelope: true,
        source: true,
        flags: true,
        uid: true,
      })) {
        const parsed = await simpleParser(msg.source as Buffer);

        const fromAddr = parsed.from?.value?.[0];
        const name = fromAddr?.name || fromAddr?.address || "Okänd avsändare";
        const email = fromAddr?.address || "";
        const subject = parsed.subject || "(inget ämne)";
        const body = (parsed.text || parsed.html || "").toString().trim();
        const receivedAt = (parsed.date ?? new Date()).toISOString();

        const cls = classifyByRules(subject, body);
        const seen = Array.isArray(msg.flags)
          ? msg.flags.includes("\\Seen")
          : msg.flags?.has?.("\\Seen") ?? false;

        const id = String(msg.uid);
        const lead: Lead = {
          id,
          from: name,
          email,
          subject,
          preview: body.replace(/\s+/g, " ").slice(0, 120),
          body,
          receivedAt,
          channel: "email",
          category: cls.category,
          status: seen ? "obesvarad" : "ny",
          priority: cls.priority,
          service: cls.service,
          regnr: findRegnrInText(`${subject}\n${body}`) ?? undefined,
          followUpsSent: 0,
          aiSummary: cls.summary,
          aiConfidence: cls.confidence,
          unread: !seen,
        };
        leads.push(lead);
        threads[id] = [
          { id: `${id}-in-0`, direction: "in", body, at: receivedAt },
        ];
      }
    }
  } finally {
    lock.release();
  }
  await client.logout();

  // Nyast först
  leads.sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt));
  return { leads, threads };
}
