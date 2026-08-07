// Verkstadsplanerare – frontend
const $ = (s) => document.querySelector(s);

const state = {
  view: 'aktiva',
  jobs: [],
  config: { smsConfigured: false, template: '' },
  ready: { job: null, mode: 'ready' },
};

const COLUMNS = [
  ['inlamnad', 'Inlämnad'],
  ['pagaende', 'Pågående'],
  ['klar', 'Lev klar'],
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('sv-SE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Samma platshållarlogik som lib/sms.js på servern.
function fillTemplate(tpl, job) {
  const namn = (job.customer_name || '').trim();
  return (tpl || '')
    .replaceAll('{namn}', namn)
    .replaceAll('{regnr}', (job.regnr || '').toUpperCase())
    .replaceAll('{bil}', job.car || '')
    .replace(/Hej\s+!/, 'Hej!')
    .replace(/ {2,}/g, ' ')
    .trim();
}

async function api(pathname, opts = {}) {
  const res = await fetch(pathname, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Fel ' + res.status);
  return data;
}

async function load() {
  const d = await api('/api/jobs?view=' + state.view);
  state.jobs = d.jobs;
  render();
}

function toast(msg, kind = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

function smsBadge(j) {
  if (!j.sms_status) return '';
  if (j.sms_status === 'skickat')
    return `<div class="sms ok">✔ SMS skickat ${esc(fmtTime(j.sms_sent_at))}</div>`;
  if (j.sms_status === 'testläge')
    return `<div class="sms test">SMS (testläge) ${esc(fmtTime(j.sms_sent_at))}</div>`;
  return `<div class="sms err" title="${esc(j.sms_status)}">⚠ SMS misslyckades</div>`;
}

function actionsFor(j) {
  const b = (action, label, cls = '') =>
    `<button class="btn ${cls}" data-action="${action}" data-id="${j.id}">${label}</button>`;
  // "Lev klar"-knappen syns på varje arbetsorder efter inlämning.
  if (j.status === 'inlamnad')
    return b('start', 'Starta arbete') + b('ready', 'Lev klar', 'primary');
  if (j.status === 'pagaende')
    return b('ready', 'Lev klar', 'primary') + b('back', '↩', 'ghost small');
  if (j.status === 'klar')
    return (
      b('delivered', 'Levererad ✔', 'primary') +
      b('resend', j.sms_status && j.sms_status.startsWith('fel') ? 'Skicka SMS igen' : 'SMS igen', 'ghost') +
      b('back', '↩', 'ghost small')
    );
  if (j.status === 'levererad') return b('reopen', 'Återöppna', 'ghost');
  return '';
}

function cardHtml(j) {
  return `<article class="card s-${esc(j.status)}">
    <div class="card-top">
      <span class="plate"><span class="eu">S</span><span class="num">${esc((j.regnr || '').toUpperCase())}</span></span>
      <span class="date">${esc(fmtDate(j.date))}</span>
      <span class="card-menu">
        <button class="icon" title="Ändra" data-action="edit" data-id="${j.id}">✎</button>
        <button class="icon" title="Ta bort" data-action="delete" data-id="${j.id}">✕</button>
      </span>
    </div>
    ${j.car ? `<div class="car">${esc(j.car)}</div>` : ''}
    <div class="cust">${esc(j.customer_name || '–')}${
      j.phone
        ? ` · <a href="tel:${esc(j.phone.replace(/[\s-]/g, ''))}">${esc(j.phone)}</a>`
        : ' · <span class="warn">mobil saknas</span>'
    }</div>
    ${j.service ? `<div class="chip">${esc(j.service)}</div>` : ''}
    ${j.note ? `<div class="note">${esc(j.note)}</div>` : ''}
    ${j.status === 'levererad' && j.levererad_at
      ? `<div class="delivered-at">Levererad ${esc(fmtTime(j.levererad_at))}</div>` : ''}
    ${smsBadge(j)}
    <div class="actions">${actionsFor(j)}</div>
  </article>`;
}

function render() {
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.view === state.view)
  );
  const board = $('#board');
  if (state.view === 'aktiva') {
    board.className = 'board';
    board.innerHTML = COLUMNS.map(([key, label]) => {
      const jobs = state.jobs.filter((j) => j.status === key);
      return `<section class="col col-${key}">
        <h2>${label} <span class="count">${jobs.length}</span></h2>
        <div class="cards">${jobs.map(cardHtml).join('') || '<div class="empty">Inga arbetsordrar</div>'}</div>
      </section>`;
    }).join('');
  } else {
    board.className = 'board single';
    board.innerHTML = `<section class="col">
      <h2>Levererade <span class="count">${state.jobs.length}</span></h2>
      <div class="cards">${state.jobs.map(cardHtml).join('') || '<div class="empty">Inga levererade bilar ännu</div>'}</div>
    </section>`;
  }
}

// ---- Kortens knappar ----
$('#board').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  const act = btn.dataset.action;
  try {
    if (act === 'edit') return openJobModal(job);
    if (act === 'ready') return openReadyModal(job, 'ready');
    if (act === 'resend') return openReadyModal(job, 'resend');
    if (act === 'start')
      await api(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'pagaende' }) });
    else if (act === 'back')
      await api(`/api/jobs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: job.status === 'klar' ? 'pagaende' : 'inlamnad' }),
      });
    else if (act === 'reopen')
      await api(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'klar' }) });
    else if (act === 'delivered') {
      await api(`/api/jobs/${id}/delivered`, { method: 'POST' });
      toast(`${(job.regnr || '').toUpperCase()} levererad`);
    } else if (act === 'delete') {
      if (!confirm(`Ta bort ${(job.regnr || '').toUpperCase()}?`)) return;
      await api(`/api/jobs/${id}`, { method: 'DELETE' });
    }
    await load();
  } catch (err) {
    toast(err.message, 'err');
  }
});

// ---- Ny arbetsorder / ändra ----
function openJobModal(job) {
  const f = $('#jobForm');
  f.reset();
  f.elements.id.value = job ? job.id : '';
  $('#jobModalTitle').textContent = job ? `Ändra ${(job.regnr || '').toUpperCase()}` : 'Ny arbetsorder';
  if (job) {
    for (const k of ['regnr', 'car', 'customer_name', 'phone', 'service', 'note', 'date'])
      f.elements[k].value = job[k] || '';
  } else {
    f.elements.date.value = new Date().toLocaleDateString('sv-SE');
  }
  $('#jobModal').showModal();
}

$('#newJobBtn').addEventListener('click', () => openJobModal(null));

$('#jobForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {};
  for (const k of ['regnr', 'car', 'customer_name', 'phone', 'service', 'note', 'date'])
    body[k] = f.elements[k].value.trim();
  const id = f.elements.id.value;
  try {
    if (id) await api(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await api('/api/jobs', { method: 'POST', body: JSON.stringify(body) });
    $('#jobModal').close();
    await load();
  } catch (err) {
    toast(err.message, 'err');
  }
});

// ---- Lev klar → SMS ----
function openReadyModal(job, mode) {
  state.ready = { job, mode };
  $('#readyTitle').textContent =
    (mode === 'resend' ? 'Skicka SMS – ' : 'Lev klar – ') + (job.regnr || '').toUpperCase();
  $('#readyPhone').textContent = job.phone || 'Mobilnummer saknas – lägg till via ✎';
  $('#readyPhone').classList.toggle('warn', !job.phone);
  $('#readyMsg').value = fillTemplate(state.config.template, job);
  $('#readyTestNote').hidden = state.config.smsConfigured;
  $('#readySendBtn').disabled = !job.phone;
  $('#readySendBtn').textContent = mode === 'resend' ? 'Skicka SMS' : 'Lev klar & skicka SMS';
  $('#readySkipBtn').hidden = mode === 'resend';
  $('#readyModal').showModal();
}

async function confirmReady(send) {
  const { job, mode } = state.ready;
  if (!job) return;
  const message = $('#readyMsg').value.trim();
  $('#readySendBtn').disabled = true;
  try {
    const d =
      mode === 'resend'
        ? await api(`/api/jobs/${job.id}/sms`, { method: 'POST', body: JSON.stringify({ message }) })
        : await api(`/api/jobs/${job.id}/ready`, { method: 'POST', body: JSON.stringify({ send, message }) });
    $('#readyModal').close();
    if (d.sms) {
      if (d.sms.ok && d.sms.dryRun)
        toast(`Testläge: SMS loggades (${d.sms.to}). Lägg in 46elks-uppgifter för riktiga SMS.`, 'test');
      else if (d.sms.ok) toast(`SMS skickat till ${d.sms.to}`);
      else toast('SMS kunde inte skickas: ' + d.sms.error, 'err');
    } else {
      toast(`${(job.regnr || '').toUpperCase()} markerad som klar`);
    }
    await load();
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    $('#readySendBtn').disabled = false;
  }
}

$('#readySendBtn').addEventListener('click', () => confirmReady(true));
$('#readySkipBtn').addEventListener('click', () => confirmReady(false));

// Stäng-knappar i dialoger
document.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => b.closest('dialog').close())
);

// Flikar
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', async () => {
    state.view = t.dataset.view;
    await load().catch((err) => toast(err.message, 'err'));
  })
);

// ---- Start ----
(async function init() {
  try {
    state.config = await api('/api/config');
  } catch {}
  $('#smsModeBadge').hidden = state.config.smsConfigured;
  await load().catch((err) => toast(err.message, 'err'));
  // Uppdatera automatiskt – bra för en skärm som står i verkstaden.
  setInterval(() => {
    if (document.hidden || document.querySelector('dialog[open]')) return;
    load().catch(() => {});
  }, 15000);
})();
