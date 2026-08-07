// Verkstadsplanerare – Ditec Sisjön
// Kör med:  node server.js   (inga beroenden behöver installeras)
import './lib/env.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store, STATUSES } from './lib/db.js';
import { fillTemplate, getTemplate, sendSms, smsConfigured } from './lib/sms.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 1e5) throw new Error('För stor förfrågan');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Ogiltig JSON');
  }
}

async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/config' && m === 'GET') {
    return json(res, 200, { smsConfigured: smsConfigured(), template: getTemplate() });
  }

  if (p === '/api/jobs' && m === 'GET') {
    return json(res, 200, { jobs: store.list(url.searchParams.get('view') || 'aktiva') });
  }

  if (p === '/api/jobs' && m === 'POST') {
    const b = await readBody(req);
    if (!b.regnr || !String(b.regnr).trim()) return json(res, 400, { error: 'Registreringsnummer krävs' });
    return json(res, 201, { job: store.create(b) });
  }

  const match = p.match(/^\/api\/jobs\/(\d+)(?:\/(ready|sms|delivered))?$/);
  if (!match) return json(res, 404, { error: 'Hittades inte' });
  const id = Number(match[1]);
  const sub = match[2];
  const job = store.get(id);
  if (!job) return json(res, 404, { error: 'Bilen hittades inte' });

  if (!sub && m === 'PATCH') {
    const b = await readBody(req);
    if ('status' in b && !STATUSES.includes(b.status)) return json(res, 400, { error: 'Ogiltig status' });
    return json(res, 200, { job: store.update(id, b) });
  }

  if (!sub && m === 'DELETE') {
    store.remove(id);
    return json(res, 200, { ok: true });
  }

  // Knappen "Lev klar": markera klar för leverans + skicka SMS till kunden.
  if (sub === 'ready' && m === 'POST') {
    const b = await readBody(req);
    const now = new Date().toISOString();
    const patch = { status: 'klar', klar_at: now };
    let sms = null;
    if (b.send) {
      const text = (b.message && String(b.message).trim()) || fillTemplate(getTemplate(), job);
      sms = await sendSms(job.phone, text);
      patch.sms_sent_at = now;
      patch.sms_text = text;
      patch.sms_status = sms.ok ? (sms.dryRun ? 'testläge' : 'skickat') : 'fel: ' + sms.error;
    }
    return json(res, 200, { job: store.update(id, patch, true), sms });
  }

  // Skicka (om) SMS utan att ändra status.
  if (sub === 'sms' && m === 'POST') {
    const b = await readBody(req);
    const text = (b.message && String(b.message).trim()) || fillTemplate(getTemplate(), job);
    const sms = await sendSms(job.phone, text);
    const patch = {
      sms_sent_at: new Date().toISOString(),
      sms_text: text,
      sms_status: sms.ok ? (sms.dryRun ? 'testläge' : 'skickat') : 'fel: ' + sms.error,
    };
    return json(res, 200, { job: store.update(id, patch, true), sms });
  }

  if (sub === 'delivered' && m === 'POST') {
    return json(res, 200, {
      job: store.update(id, { status: 'levererad', levererad_at: new Date().toISOString() }, true),
    });
  }

  return json(res, 405, { error: 'Metoden stöds inte' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);

    // Statiska filer från public/
    let file;
    try {
      file = decodeURIComponent(url.pathname);
    } catch {
      return json(res, 400, { error: 'Ogiltig sökväg' });
    }
    if (file === '/') file = '/index.html';
    const full = path.normalize(path.join(PUBLIC, file));
    if (!full.startsWith(PUBLIC + path.sep)) return json(res, 404, { error: 'Hittades inte' });
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return json(res, 404, { error: 'Hittades inte' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  } catch (err) {
    console.error(err);
    json(res, 500, { error: err.message || 'Serverfel' });
  }
});

server.listen(PORT, () => {
  console.log(`Verkstadsplanerare igång: http://localhost:${PORT}`);
  console.log(`Lagring: ${store.kind === 'sqlite' ? 'SQLite (data/verkstad.db)' : 'JSON-fil (data/jobs.json)'}`);
  console.log(
    smsConfigured()
      ? 'SMS: 46elks konfigurerat – riktiga SMS skickas.'
      : 'SMS: testläge (loggas i terminalen, skickas inte). Se README för att aktivera.'
  );
});
