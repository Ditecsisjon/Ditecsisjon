// SMS-utskick via 46elks (svensk SMS-leverantör, https://46elks.se).
// Utan API-uppgifter körs "testläge": meddelandet loggas i terminalen
// men skickas inte. Vill man byta leverantör (Twilio, HelloSMS m.fl.)
// är det bara sendSms() som behöver ändras.

function getConf() {
  return {
    user: process.env.ELKS_API_USERNAME || '',
    pass: process.env.ELKS_API_PASSWORD || '',
    from: process.env.SMS_FROM || 'DitecSisjon',
    template:
      process.env.SMS_TEMPLATE ||
      'Hej {namn}! Din bil {regnr} är nu klar för hämtning hos Ditec Sisjön. Välkommen! /Ditec Sisjön',
  };
}

export function smsConfigured() {
  const c = getConf();
  return Boolean(c.user && c.pass);
}

export function getTemplate() {
  return getConf().template;
}

// Normaliserar svenska mobilnummer till E.164: "070-123 45 67" -> "+46701234567"
export function normalizePhone(raw) {
  let p = String(raw || '').replace(/[\s\-().]/g, '');
  if (!p) return null;
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0')) p = '+46' + p.slice(1);
  if (!p.startsWith('+')) p = '+' + p;
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

// Fyller i mallens platshållare {namn} {regnr} {bil} med bilens uppgifter.
export function fillTemplate(tpl, job) {
  const namn = (job.customer_name || '').trim();
  return tpl
    .replaceAll('{namn}', namn)
    .replaceAll('{regnr}', (job.regnr || '').toUpperCase())
    .replaceAll('{bil}', job.car || '')
    .replace(/Hej\s+!/, 'Hej!')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export async function sendSms(to, text) {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: 'Ogiltigt eller saknat telefonnummer' };
  if (!text || !text.trim()) return { ok: false, error: 'Tomt meddelande' };

  const conf = getConf();
  if (!smsConfigured()) {
    console.log(`[SMS testläge] Till ${phone}: ${text}`);
    return { ok: true, dryRun: true, to: phone };
  }

  try {
    const res = await fetch('https://api.46elks.com/a1/sms', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${conf.user}:${conf.pass}`).toString('base64'),
      },
      body: new URLSearchParams({ from: conf.from, to: phone, message: text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `46elks ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, id: data.id, to: phone };
  } catch (err) {
    return { ok: false, error: 'Nätverksfel: ' + err.message };
  }
}
