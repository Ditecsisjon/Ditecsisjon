// Lagring av bilar/jobb. Använder Nodes inbyggda SQLite (Node 22.13+).
// På äldre Node, eller med STORE=json, används en JSON-fil i stället –
// samma gränssnitt, inga externa beroenden i något av lägena.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const STATUSES = ['inlamnad', 'pagaende', 'klar', 'levererad'];

// Fält som får ändras via API:t. Interna fält sätts bara av servern själv.
const EDITABLE = ['regnr', 'car', 'customer_name', 'phone', 'service', 'note', 'date', 'status'];
const INTERNAL = ['klar_at', 'levererad_at', 'sms_sent_at', 'sms_status', 'sms_text'];

const nowIso = () => new Date().toISOString();
const today = () => new Date().toLocaleDateString('sv-SE'); // ger YYYY-MM-DD

function clean(input) {
  const out = {};
  for (const k of EDITABLE) {
    if (k in input) out[k] = input[k] == null ? null : String(input[k]).trim();
  }
  return out;
}

function createSqliteStore(DatabaseSync) {
  const db = new DatabaseSync(path.join(DATA_DIR, 'verkstad.db'));
  db.exec(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regnr TEXT NOT NULL,
    car TEXT, customer_name TEXT, phone TEXT,
    service TEXT, note TEXT, date TEXT,
    status TEXT NOT NULL DEFAULT 'inlamnad',
    klar_at TEXT, levererad_at TEXT,
    sms_sent_at TEXT, sms_status TEXT, sms_text TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  const byId = (id) => db.prepare('SELECT * FROM jobs WHERE id = ?').get(Number(id)) || null;

  return {
    kind: 'sqlite',
    list(view) {
      if (view === 'levererade')
        return db.prepare("SELECT * FROM jobs WHERE status='levererad' ORDER BY levererad_at DESC LIMIT 200").all();
      if (view === 'alla')
        return db.prepare('SELECT * FROM jobs ORDER BY date, id').all();
      return db.prepare("SELECT * FROM jobs WHERE status!='levererad' ORDER BY date, id").all();
    },
    get: byId,
    create(input) {
      const j = { status: 'inlamnad', ...clean(input) };
      if (!STATUSES.includes(j.status)) j.status = 'inlamnad';
      if (!j.date) j.date = today();
      const now = nowIso();
      const r = db
        .prepare(`INSERT INTO jobs (regnr, car, customer_name, phone, service, note, date, status, created_at, updated_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(j.regnr, j.car || null, j.customer_name || null, j.phone || null,
             j.service || null, j.note || null, j.date, j.status, now, now);
      return byId(Number(r.lastInsertRowid));
    },
    update(id, patch, internal = false) {
      const allowed = internal ? [...EDITABLE, ...INTERNAL] : EDITABLE;
      const sets = [], vals = [];
      for (const k of allowed) {
        if (k in patch) {
          sets.push(`${k} = ?`);
          vals.push(patch[k] == null ? null : String(patch[k]).trim());
        }
      }
      if (sets.length) {
        sets.push('updated_at = ?');
        vals.push(nowIso(), Number(id));
        db.prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      }
      return byId(id);
    },
    remove(id) {
      db.prepare('DELETE FROM jobs WHERE id = ?').run(Number(id));
    },
  };
}

function createJsonStore() {
  const FILE = path.join(DATA_DIR, 'jobs.json');
  let data = { nextId: 1, jobs: [] };
  try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
  const save = () => {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, FILE);
  };
  const byId = (id) => data.jobs.find((j) => j.id === Number(id)) || null;
  const sortDate = (a, b) => (a.date || '').localeCompare(b.date || '') || a.id - b.id;

  return {
    kind: 'json',
    list(view) {
      if (view === 'levererade')
        return data.jobs
          .filter((j) => j.status === 'levererad')
          .sort((a, b) => (b.levererad_at || '').localeCompare(a.levererad_at || ''))
          .slice(0, 200);
      if (view === 'alla') return [...data.jobs].sort(sortDate);
      return data.jobs.filter((j) => j.status !== 'levererad').sort(sortDate);
    },
    get: byId,
    create(input) {
      const now = nowIso();
      const j = {
        id: data.nextId++,
        regnr: '', car: null, customer_name: null, phone: null,
        service: null, note: null, date: null, status: 'inlamnad',
        klar_at: null, levererad_at: null,
        sms_sent_at: null, sms_status: null, sms_text: null,
        created_at: now, updated_at: now,
        ...clean(input),
      };
      if (!STATUSES.includes(j.status)) j.status = 'inlamnad';
      if (!j.date) j.date = today();
      data.jobs.push(j);
      save();
      return j;
    },
    update(id, patch, internal = false) {
      const j = byId(id);
      if (!j) return null;
      const allowed = internal ? [...EDITABLE, ...INTERNAL] : EDITABLE;
      for (const k of allowed) {
        if (k in patch) j[k] = patch[k] == null ? null : String(patch[k]).trim();
      }
      j.updated_at = nowIso();
      save();
      return j;
    },
    remove(id) {
      data.jobs = data.jobs.filter((j) => j.id !== Number(id));
      save();
    },
  };
}

let store;
if ((process.env.STORE || '').toLowerCase() !== 'json') {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    store = createSqliteStore(DatabaseSync);
  } catch {
    // node:sqlite saknas (Node < 22.13) – fall tillbaka på JSON-fil.
  }
}
if (!store) store = createJsonStore();

export { store };
