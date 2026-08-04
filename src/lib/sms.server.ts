// Server-sida: skickar SMS via 46elks. Utan konfiguration returneras
// { configured:false } och inget skickas.

import "server-only";

export async function sendSms(
  to: string,
  message: string
): Promise<{ configured: boolean; sent: boolean; error?: string }> {
  const user = process.env.SMS_API_USERNAME;
  const pass = process.env.SMS_API_PASSWORD;
  const from = process.env.SMS_FROM || "Ditec";
  if (!user || !pass) return { configured: false, sent: false };

  try {
    const body = new URLSearchParams({ from, to, message });
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      return { configured: true, sent: false, error: `SMS-fel (${res.status})` };
    }
    return { configured: true, sent: true };
  } catch (err) {
    return { configured: true, sent: false, error: err instanceof Error ? err.message : "fel" };
  }
}
