// Testar mejlkopplingen: ansluter till IMAP, listar mappar och verifierar SMTP.
// Returnerar tydlig status utan att avslöja lösenord. Använd för att snabbt se
// om uppgifterna i .env.local stämmer innan du börjar hämta riktiga mejl.

import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { readMailConfig } from "@/lib/mail";
import { readSmtpConfig } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const imapCfg = readMailConfig();
  const smtpCfg = readSmtpConfig();

  const result: {
    configured: boolean;
    imap: { ok: boolean; account?: string; folders?: string[]; error?: string };
    smtp: { ok: boolean; from?: string; error?: string };
  } = {
    configured: !!imapCfg,
    imap: { ok: false },
    smtp: { ok: false },
  };

  // IMAP: anslut och lista mappar
  if (imapCfg) {
    const client = new ImapFlow({
      host: imapCfg.host,
      port: imapCfg.port,
      secure: imapCfg.secure,
      auth: { user: imapCfg.user, pass: imapCfg.pass },
      logger: false,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    try {
      await client.connect();
      const boxes = await client.list();
      result.imap = {
        ok: true,
        account: imapCfg.user,
        folders: boxes.map((b) => b.path).slice(0, 50),
      };
      await client.logout();
    } catch (err) {
      result.imap = {
        ok: false,
        account: imapCfg.user,
        error: err instanceof Error ? err.message : "Kunde inte ansluta till IMAP.",
      };
    }
  } else {
    result.imap.error = "IMAP_USER/IMAP_PASSWORD saknas i .env.local.";
  }

  // SMTP: verifiera anslutning (skickar inget mejl)
  if (smtpCfg) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpCfg.host,
        port: smtpCfg.port,
        secure: smtpCfg.secure,
        auth: { user: smtpCfg.user, pass: smtpCfg.pass },
        connectionTimeout: 15000,
      });
      await transporter.verify();
      result.smtp = { ok: true, from: smtpCfg.from };
    } catch (err) {
      result.smtp = {
        ok: false,
        from: smtpCfg.from,
        error: err instanceof Error ? err.message : "Kunde inte verifiera SMTP.",
      };
    }
  } else {
    result.smtp.error = "SMTP-uppgifter saknas (och inga IMAP-uppgifter att återanvända).";
  }

  return NextResponse.json(result);
}
