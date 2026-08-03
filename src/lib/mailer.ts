// Server-sida: skickar e-post via SMTP (t.ex. Websupport). Återanvänder IMAP-
// uppgifterna om inga separata SMTP-uppgifter är satta.

import "server-only";
import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function readSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER || process.env.IMAP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.IMAP_PASSWORD;
  if (!user || !pass) return null;
  return {
    host: process.env.SMTP_HOST || "smtp.websupport.se",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE ?? "true") !== "false",
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

export interface SendInput {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(config: SmtpConfig, input: SendInput) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  return { messageId: info.messageId };
}
