// ── Constants ──────────────────────────────────────────────────────────────
const COLORS = ['#7c6ff7','#60a5fa','#4ade80','#fbbf24','#f87171','#f472b6','#2dd4bf','#fb923c','#c084fc','#94a3b8'];
const OC = {Abhishek:['#B5D4F4','#0C447C'],Hemanth:['#C0DD97','#27500A'],Both:['#3a3a4a','#9896a8']};
const SL = {todo:'To do',inprogress:'In progress',review:'In review',done:'Done',blocked:'Blocked'};
const SS = {
  todo:      'background:rgba(148,163,184,.09);color:#94a3b8;border:1px solid rgba(148,163,184,.2)',
  inprogress:'background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-bd)',
  review:    'background:var(--purple-bg);color:var(--purple);border:1px solid var(--purple-bd)',
  done:      'background:var(--green-bg);color:var(--green);border:1px solid var(--green-bd)',
  blocked:   'background:var(--red-bg);color:var(--red);border:1px solid var(--red-bd)',
};
const POINT_TYPES = {action:'Action',decision:'Decision',risk:'Risk',note:'Note',followup:'Follow-up'};
const PT_CLASS = {action:'mp-action',decision:'mp-decision',risk:'mp-risk',note:'mp-note',followup:'mp-followup'};
const MT_CLASS = {standup:'mt-standup',planning:'mt-planning',review:'mt-review',retro:'mt-retro',client:'mt-client',other:'mt-other'};
const CONFIG = (typeof window !== 'undefined' && window.COGNIDO_CONFIG) ? window.COGNIDO_CONFIG : {};
const CYCLE = {todo:'inprogress',inprogress:'review',review:'done',done:'blocked',blocked:'todo'};
const THEME_KEY = 'cognido_theme';
const THEMES = { LIGHT: 'light', DARK: 'dark' };
const TASK_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TASK_ID_LENGTH = 5;
let currentTheme = THEMES.DARK;
let systemThemeWatcherApplied = false;

try {
  const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
  if (storedTheme === THEMES.LIGHT || storedTheme === THEMES.DARK) { currentTheme = storedTheme; }
  else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) { currentTheme = THEMES.LIGHT; }
} catch(e) {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) { currentTheme = THEMES.LIGHT; }
}
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

function updateThemeToggleUI(mode) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.innerHTML = mode === THEMES.LIGHT
      ? '<circle cx="7" cy="7" r="3.2"></circle><line x1="7" y1="1" x2="7" y2="3"></line><line x1="7" y1="11" x2="7" y2="13"></line><line x1="1" y1="7" x2="3" y2="7"></line><line x1="11" y1="7" x2="13" y2="7"></line><line x1="2.6" y1="2.6" x2="4" y2="4"></line><line x1="10" y1="10" x2="11.4" y2="11.4"></line><line x1="10" y1="4" x2="11.4" y2="2.6"></line><line x1="2.6" y1="11.4" x2="4" y2="10"></line>'
      : '<path d="M9.5 1.5a4.9 4.9 0 1 0 4 7.8 4.2 4.2 0 0 1-4-7.8z"></path>';
  }
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.setAttribute('aria-label', mode === THEMES.LIGHT ? 'Switch to dark mode' : 'Switch to light mode');
}

function applyTheme(mode) {
  currentTheme = mode === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }
  updateThemeToggleUI(currentTheme);
}

function initTheme() {
  applyTheme(currentTheme);
  if (systemThemeWatcherApplied) return;
  if (typeof window !== 'undefined' && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      let stored = null;
      try { stored = localStorage.getItem(THEME_KEY); } catch(e2){}
      if (!stored) applyTheme(e.matches ? THEMES.LIGHT : THEMES.DARK);
    };
    if (media.addEventListener) media.addEventListener('change', handler);
    else if (media.addListener) media.addListener(handler);
    systemThemeWatcherApplied = true;
  }
}

function toggleTheme() {
  const next = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, next); } catch(e){}
  applyTheme(next);
  toast('Theme: ' + (next === THEMES.LIGHT ? 'Light' : 'Dark'));
}

const QUOTES = [
  {line:'Small steps make big stories.',author:'Cognido'},
  {line:'Progress loves a checklist.',author:'Cognido'},
  {line:'Do the thing today your future self will high-five.',author:'Future You'},
  {line:'Focus beats frenzy every single time.',author:'Momentum'},
  {line:'Tiny wins are still wins; log them.',author:'Cognido'},
  {line:'Ship it, then improve it.',author:'Cognido'},
  {line:'Clarity is the real superpower.',author:'Cognido'},
];
let quoteIndex = 0, quoteTimer = null;
function setQuote(idx) {
  quoteIndex = ((idx % QUOTES.length) + QUOTES.length) % QUOTES.length;
  const el = document.getElementById('quote-text');
  if (!el) return;
  const {line, author} = QUOTES[quoteIndex];
  el.textContent = author ? `${line} — ${author}` : line;
}
function startQuoteRotation() {
  if (quoteTimer) clearInterval(quoteTimer);
  setQuote(Math.floor(Math.random() * QUOTES.length));
  quoteTimer = setInterval(() => setQuote(quoteIndex + 1), 10000);
}

// ── State ──────────────────────────────────────────────────────────────────
let API_URL = CONFIG.apiUrl;
let tasks = [], categories = [], meetings = [], nid = 1, nmid = 1;
let editId = null, editMeetingId = null, currentView = 'all', currentSection = 'tasks';
let newCatColor = COLORS[0], saveTimer = null;
let currentMeetingId = null;
let draftPoints = [];

function normalizeTaskId(id) {
  return id === undefined || id === null ? '' : String(id).trim().toUpperCase();
}

function generateTaskId(externalSet) {
  const used = externalSet instanceof Set ? externalSet : new Set((tasks || []).map(t => normalizeTaskId(t.id)).filter(Boolean));
  for (let attempt = 0; attempt < 1000; attempt++) {
    let candidate = '';
    for (let i = 0; i < TASK_ID_LENGTH; i++) {
      candidate += TASK_ID_CHARS.charAt(Math.floor(Math.random() * TASK_ID_CHARS.length));
    }
    if (!used.has(candidate)) {
      if (!(externalSet instanceof Set)) used.add(candidate);
      return candidate;
    }
  }
  throw new Error('Unable to generate unique task id');
}


// ── Init ───────────────────────────────────────────────────────────────────
window.onload = function() {
  initTheme();
  renderSwatches();
  startQuoteRotation();
  const authed = CONFIG.authStorageKey && localStorage.getItem(CONFIG.authStorageKey) === 'yes';
  if (authed) {
    API_URL = CONFIG.apiUrl;
    showApp();
    loadFromSheet();
  } else {
    const uf = document.getElementById('login-username');
    const pf = document.getElementById('login-password');
    if (uf) uf.focus();
    if (pf) pf.value = '';
  }
};

// ── Section switching ──────────────────────────────────────────────────────
function switchSection(section) {
  currentSection = section;
  const tasksContent   = document.getElementById('app-content');
  const meetingsContent= document.getElementById('meetings-content');
  const taskSubnav     = document.getElementById('task-subnav');
  const addBtn         = document.getElementById('add-btn-label');
  const catBtn         = document.getElementById('cat-btn');

  if (section === 'tasks') {
    if (tasksContent)   { tasksContent.style.display = 'flex'; tasksContent.style.flexDirection = 'column'; tasksContent.style.overflow = 'hidden'; tasksContent.style.flex = '1'; }
    if (meetingsContent){ meetingsContent.style.display = 'none'; }
    if (taskSubnav)     { taskSubnav.style.display = 'block'; }
    if (addBtn)         { addBtn.textContent = 'Add task'; }
    if (catBtn)         { catBtn.style.display = ''; }
    document.getElementById('view-title').textContent = 'All tasks';
    document.getElementById('view-sub').textContent   = 'Plan, track, and celebrate every win.';
    document.getElementById('nav-tasks-view').classList.add('active');
    document.getElementById('nav-meetings-view').classList.remove('active');
  } else {
    if (tasksContent)   { tasksContent.style.display = 'none'; }
    if (meetingsContent){ meetingsContent.style.display = 'flex'; meetingsContent.style.flexDirection = 'column'; meetingsContent.style.overflow = 'hidden'; meetingsContent.style.flex = '1'; }
    if (taskSubnav)     { taskSubnav.style.display = 'none'; }
    if (addBtn)         { addBtn.textContent = 'Add meeting'; }
    if (catBtn)         { catBtn.style.display = 'none'; }
    document.getElementById('view-title').textContent = 'Meetings';
    document.getElementById('view-sub').textContent   = 'Notes, decisions, actions from every meeting.';
    document.getElementById('nav-tasks-view').classList.remove('active');
    document.getElementById('nav-meetings-view').classList.add('active');
    renderMeetings();
  }
}

function handleAddBtn() {
  if (currentSection === 'meetings') openMeetingDrawer(null);
  else openDrawer(null);
}

// ── Auth ───────────────────────────────────────────────────────────────────
function wiggle(el) { if (!el) return; el.classList.add('wiggle'); setTimeout(() => el.classList.remove('wiggle'), 380); }

function showApp() {
  document.getElementById('config-banner').style.display = 'none';
  const ac = document.getElementById('app-content');
  ac.style.display = 'flex'; ac.style.flexDirection = 'column'; ac.style.overflow = 'hidden'; ac.style.flex = '1';
}

function hideApp() {
  const b = document.getElementById('config-banner');
  const ac = document.getElementById('app-content');
  const mc = document.getElementById('meetings-content');
  if (b)  b.style.display  = 'block';
  if (ac) ac.style.display = 'none';
  if (mc) mc.style.display = 'none';
}

function api(body) {
  return fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type':'text/plain;charset=utf-8'}
  }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}

function connectSheet() {
  const userEl = document.getElementById('login-username');
  const passEl = document.getElementById('login-password');
  const username = (userEl ? userEl.value : '').trim().toLowerCase();
  const password = passEl ? passEl.value : '';
  const envCreds = CONFIG.credentials || {};
  if (!CONFIG.apiUrl) { toast('Set COGNIDO_API_URL in config/config.env'); return; }
  if (!CONFIG.authStorageKey) { toast('Set COGNIDO_AUTH_KEY in config/config.env'); return; }
  if (!envCreds.username || !envCreds.password) { toast('Set COGNIDO_USERNAME and COGNIDO_PASSWORD in config/config.env'); return; }
  if ((envCreds.username || '').toLowerCase() !== username || envCreds.password !== password) {
    toast('Access denied. Check your credentials.');
    wiggle(document.getElementById('config-banner'));
    if (passEl) passEl.focus();
    return;
  }
  API_URL = CONFIG.apiUrl;
  setSyncState('loading', 'Connecting...');
  api({action:'ping'}).then(r => {
    const ok = r && (r.ok === true || !r.error);
    if (ok) {
      if (CONFIG.authStorageKey) localStorage.setItem(CONFIG.authStorageKey, 'yes');
      if (passEl) passEl.value = '';
      showApp();
      loadFromSheet();
      toast('Welcome back to Cognido!');
    } else {
      setSyncState('error', 'Connection failed');
      toast('Could not reach the sheet. Check COGNIDO_API_URL.');
    }
  }).catch(() => { setSyncState('error', 'Connection failed'); toast('Network error — check your connection.'); });
}

function logout() {
  if (CONFIG.authStorageKey) localStorage.removeItem(CONFIG.authStorageKey);
  API_URL = '';
  hideApp();
  setSyncState('setup', 'Not connected');
  const uf = document.getElementById('login-username');
  const pf = document.getElementById('login-password');
  if (uf) { uf.value = ''; uf.focus(); }
  if (pf) pf.value = '';
  toast('Logged out. See you next time!');
}

// ── Sheet API ──────────────────────────────────────────────────────────────
function loadFromSheet() {
  setSyncState('loading', 'Loading...');
  api({action:'load'}).then(data => {
    if (data.error) { setSyncState('error', 'Load error'); toast('Error: ' + data.error); return; }
    if (!data.tasks || data.tasks.length === 0) {
      tasks = []; categories = []; meetings = [];
      nid = (data.meta && data.meta.nextId) ? parseInt(data.meta.nextId) : 1;
      nmid = (data.meta && data.meta.nextMid) ? parseInt(data.meta.nextMid) : 1;
      setSyncState('ok', 'Ready — no tasks yet');
    } else {
      const idSet = new Set();
      let patchedIds = false;
      tasks = (data.tasks || []).map(t => {
        let normalized = normalizeTaskId(t.id);
        if (!normalized || idSet.has(normalized)) {
          normalized = generateTaskId(idSet);
          patchedIds = true;
        }
        idSet.add(normalized);
        return {...t, id: normalized};
      });
      categories = data.categories || [];
      meetings   = (data.meetings || []).map(m => ({
        ...m,
        id: parseInt(m.id)||0,
        points: m.points ? (typeof m.points === 'string' ? JSON.parse(m.points) : m.points) : []
      }));
      nid  = (data.meta && data.meta.nextId) ? parseInt(data.meta.nextId) : 1;
      nmid = (data.meta && data.meta.nextMid) ? parseInt(data.meta.nextMid) : (Math.max(0,...meetings.map(m=>m.id)) + 1);
      setSyncState('ok', 'Synced');
      if (patchedIds) scheduleSave();
    }
    render();
    updateMeetingNav();
  }).catch(err => {
    console.error('loadFromSheet failed', err);
    const msg = err && err.message ? err.message : 'Network error';
    setSyncState('error', 'Network error');
    toast(msg);
  });
}

function pushAll() {
  setSyncState('saving', 'Saving...');
  const meetingsForSheet = meetings.map(m => ({...m, points: JSON.stringify(m.points||[])}));
  Promise.all([
    api({action:'saveTasks',      tasks}),
    api({action:'saveCategories', categories}),
    api({action:'saveMeetings',   meetings: meetingsForSheet}),
    api({action:'saveMeta',       meta:{nextId:nid, nextMid:nmid}}),
  ]).then(() => setSyncState('ok', 'Synced')).catch(() => setSyncState('error', 'Save failed'));
}

function scheduleSave() {
  setSyncState('saving', 'Saving...');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => pushAll(), 1200);
}

function syncNow() {
  if (!CONFIG.authStorageKey || !localStorage.getItem(CONFIG.authStorageKey)) {
    wiggle(document.getElementById('config-banner')); toast('Log in to sync.'); return;
  }
  clearTimeout(saveTimer); pushAll(); toast('Synced to Google Sheet');
}

function setSyncState(type, msg) {
  const bar  = document.getElementById('sync-bar');
  const dot  = bar.querySelector('.sync-dot');
  const text = document.getElementById('sync-text');
  bar.className = 'sync-bar ' + type;
  dot.className = 'sync-dot' + (type === 'saving' || type === 'loading' ? ' pulse' : '');
  text.textContent = msg;
}

// ── Views ──────────────────────────────────────────────────────────────────
function setView(v) {
  currentView = v;
  const map = {all:'All tasks',inprogress:'In progress',review:'In review',blocked:'Blocked',done:'Done'};
  document.getElementById('view-title').textContent = map[v] || v;
  document.querySelectorAll('.nav-item[id^="nav-"]').forEach(el => {
    el.classList.toggle('active', el.id === 'nav-' + v);
  });
  const sf = document.getElementById('f-status-filter');
  if (sf) sf.value = '';
  render();
}

// ── Advanced Filters ───────────────────────────────────────────────────────
function clearFilters() {
  const ids = ['search','f-cat','f-status-filter','f-assigned','f-pri','f-date-range'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  currentView = 'all';
  document.querySelectorAll('.nav-item[id^="nav-"]').forEach(el => el.classList.remove('active'));
  const navAll = document.getElementById('nav-all');
  if (navAll) navAll.classList.add('active');
  document.getElementById('view-title').textContent = 'All tasks';
  render();
  toast('Filters cleared');
}

function getActiveFilterCount() {
  const ids = ['search','f-cat','f-status-filter','f-assigned','f-pri','f-date-range'];
  return ids.filter(id => { const el = document.getElementById(id); return el && el.value.trim() !== ''; }).length;
}

function renderActivePills() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  const filters = [];
  const q = (document.getElementById('search')||{}).value?.trim();
  const fc = (document.getElementById('f-cat')||{}).value;
  const fs = (document.getElementById('f-status-filter')||{}).value;
  const fa = (document.getElementById('f-assigned')||{}).value?.trim();
  const fp = (document.getElementById('f-pri')||{}).value;
  const fd = (document.getElementById('f-date-range')||{}).value;
  if (q)  filters.push({label:`"${q}"`,        clear:()=>{ document.getElementById('search').value=''; render(); }});
  if (fc) { const c = categories.find(x=>x.id===fc); filters.push({label: c?c.name:'Category', clear:()=>{ document.getElementById('f-cat').value=''; render(); }}); }
  if (fs) { const lbl = fs==='not-done'?'Not completed':SL[fs]||fs; filters.push({label:lbl, clear:()=>{ document.getElementById('f-status-filter').value=''; render(); }}); }
  if (fa) filters.push({label:`Assigned: ${fa}`, clear:()=>{ document.getElementById('f-assigned').value=''; render(); }});
  if (fp) filters.push({label:`Priority: ${fp}`, clear:()=>{ document.getElementById('f-pri').value=''; render(); }});
  if (fd) filters.push({label:fd.replace('-',' '), clear:()=>{ document.getElementById('f-date-range').value=''; render(); }});

  container.innerHTML = filters.map((f,i) =>
    `<span class="filter-pill">${f.label}<button onclick="activeFilterClear(${i})" title="Remove filter"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg></button></span>`
  ).join('');

  window._activePillClears = filters.map(f => f.clear);
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) clearBtn.classList.toggle('has-filters', filters.length > 0);
}

function activeFilterClear(i) {
  if (window._activePillClears && window._activePillClears[i]) window._activePillClears[i]();
}

// ── Render Tasks ──────────────────────────────────────────────────────────
function getCat(id) { return categories.find(c => c.id === id) || {name:'?',color:'#888'}; }

function isDateInRange(dateStr, range) {
  if (!dateStr) return range === 'no-date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date(); now.setHours(0,0,0,0);
  const today = new Date(now);
  const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
  if (range === 'overdue')   return d < today;
  if (range === 'today')     return d.toDateString() === today.toDateString();
  if (range === 'this-week') return d >= today && d <= endOfWeek;
  if (range === 'no-date')   return false;
  return true;
}

function render() {
  updateStats();
  renderCatNav();
  renderActivePills();

  const q  = (document.getElementById('search')||{}).value?.toLowerCase() || '';
  const fc = (document.getElementById('f-cat')||{}).value || '';
  const fs = (document.getElementById('f-status-filter')||{}).value || '';
  const fa = ((document.getElementById('f-assigned')||{}).value || '').trim().toLowerCase();
  const fp = (document.getElementById('f-pri')||{}).value || '';
  const fd = (document.getElementById('f-date-range')||{}).value || '';

  let list = tasks.filter(t => {
    // sidebar view filter (overrides status filter if not 'all')
    if (currentView !== 'all' && t.status !== currentView) return false;
    // search
    if (q && !t.task.toLowerCase().includes(q) && !(t.remarks||'').toLowerCase().includes(q) && !(t.owner||'').toLowerCase().includes(q)) return false;
    // category
    if (fc && t.catId !== fc) return false;
    // status dropdown filter
    if (fs) {
      if (fs === 'not-done') { if (t.status === 'done') return false; }
      else if (t.status !== fs) return false;
    }
    // assigned
    if (fa) {
      const ov = (t.owner || '').toLowerCase();
      if (fa === 'unassigned') { if (ov) return false; }
      else if (!ov.includes(fa)) return false;
    }
    // priority
    if (fp && t.pri !== fp) return false;
    // date range
    if (fd) { if (!isDateInRange(t.date, fd)) return false; }
    return true;
  });

  const tb = document.getElementById('tbody');
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="20" cy="20" r="16"/><line x1="13" y1="20" x2="27" y2="20"/></svg><p>No tasks match the current filters</p></div></td></tr>`;
    return;
  }

  tb.innerHTML = list.map((t, idx) => {
    const cat  = getCat(t.catId);
    const ownerName   = (t.owner || '').trim();
    const displayOwner = ownerName || 'Unassigned';
    const oc   = OC[ownerName] || ['#3a3a4a','#aaa'];
    const init = ownerName ? ownerName.slice(0,2).toUpperCase() : '--';
    const priC = t.pri === 'high' ? '#f87171' : t.pri === 'low' ? '#94a3b8' : '#fbbf24';
    const taskId = normalizeTaskId(t.id);
    const handlerId = (taskId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const idLiteral = `'${handlerId}'`;
    let dateDisplay = '--';
    if (t.date) {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const now = new Date(); now.setHours(0,0,0,0);
        const isOverdue = d < now && t.status !== 'done';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const label = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        dateDisplay = isOverdue ? `<span style="color:var(--red)">${label}</span>` : label;
      }
    }
    return `<tr>
      <td><span class="id-chip" title="${taskId}">${idx + 1}</span></td>
      <td>
        <div class="task-text ${t.status==='done'?'task-done':''}">${t.task}</div>
        ${t.remarks ? `<div class="rmk-text">${t.remarks}</div>` : ''}
      </td>
      <td><span class="cat-badge" style="background:${cat.color}18;color:${cat.color};border:1px solid ${cat.color}30"><span style="width:5px;height:5px;border-radius:50%;background:${cat.color};display:inline-block;flex-shrink:0"></span>${cat.name}</span></td>
      <td><span class="owner-chip"><span class="av" style="background:${oc[0]};color:${oc[1]}">${init}</span><span style="font-size:12px">${displayOwner}</span></span></td>
      <td style="font-size:12px;color:var(--text3);font-family:var(--mono)">${t.effort||'--'}</td>
      <td style="font-size:12px;color:var(--text3);font-family:var(--mono)">${dateDisplay}</td>
      <td><span class="st-badge" style="${SS[t.status]||''}" onclick="cycleStatus(${idLiteral})" title="Click to cycle status">${SL[t.status]||t.status}</span></td>
      <td><span class="pri-dot" style="background:${priC}" title="${t.pri||'med'} priority"></span></td>
      <td><div class="act-row">
        <button class="icon-btn edit" onclick="openDrawer(${idLiteral})" title="Edit">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z"/></svg>
        </button>
        <button class="icon-btn del" onclick="delTask(${idLiteral})" title="Delete">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
        </button>
      </div></td>
    </tr>`;
  }).join('');
}

function updateStats() {
  const n    = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inp  = tasks.filter(t => t.status === 'inprogress' || t.status === 'review').length;
  const blk  = tasks.filter(t => t.status === 'blocked').length;
  const pct  = n ? Math.round(done / n * 100) : 0;
  document.getElementById('s-total').textContent = n;
  document.getElementById('s-done').textContent  = done;
  document.getElementById('s-inp').textContent   = inp;
  document.getElementById('s-blk').textContent   = blk;
  document.getElementById('sb-done').style.width = (n ? Math.round(done/n*100) : 0) + '%';
  document.getElementById('sb-inp').style.width  = (n ? Math.round(inp/n*100)  : 0) + '%';
  document.getElementById('sb-blk').style.width  = (n ? Math.round(blk/n*100) : 0) + '%';
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-pct').textContent  = pct + '%';
  document.getElementById('nc-all').textContent  = n;
  document.getElementById('nc-inp').textContent  = inp;
  document.getElementById('nc-rev').textContent  = tasks.filter(t=>t.status==='review').length;
  document.getElementById('nc-blk').textContent  = blk;
  document.getElementById('nc-done').textContent = done;
}

function renderCatNav() {
  const nav = document.getElementById('cat-nav');
  const sel = document.getElementById('f-cat');
  const cur = sel ? sel.value : '';
  nav.innerHTML = '';
  if (sel) {
    sel.innerHTML = '<option value="">All categories</option>';
    categories.forEach(c => { const o = document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
    sel.value = cur;
  }
  categories.forEach(c => {
    const count = tasks.filter(t => t.catId === c.id).length;
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.innerHTML = `<span class="cat-dot" style="background:${c.color}"></span>${c.name}<span class="nav-count">${count}</span>`;
    btn.onclick = () => {
      if (sel) sel.value = c.id;
      currentView = 'all';
      document.getElementById('view-title').textContent = c.name;
      document.querySelectorAll('.nav-item[id^="nav-"]').forEach(el => el.classList.remove('active'));
      render();
    };
    nav.appendChild(btn);
  });
  renderDrawerCats();
}

function renderDrawerCats() {
  const sel = document.getElementById('f-cat-d'); if (!sel) return;
  const cur = sel.value; sel.innerHTML = '';
  categories.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
  if (cur && categories.find(c=>c.id===cur)) sel.value = cur;
}

// ── Task CRUD ──────────────────────────────────────────────────────────────
function cycleStatus(id) {
  const targetId = String(id);
  const t = tasks.find(x => x.id === targetId); if (!t) return;
  t.status = CYCLE[t.status] || 'todo';
  render(); scheduleSave(); toast('Status → ' + SL[t.status]);
}

function delTask(id) {
  if (!confirm('Delete this task?')) return;
  const targetId = String(id);
  tasks = tasks.filter(x => x.id !== targetId);
  render(); scheduleSave(); toast('Task deleted');
}

function openDrawer(id) {
  editId = (id === null ? null : String(id));
  renderDrawerCats();
  if (id === null) {
    document.getElementById('drawer-title').textContent = 'Add task';
    document.getElementById('f-task').value     = '';
    document.getElementById('f-remarks').value  = '';
    document.getElementById('f-cat-d').value    = categories[0]?.id || '';
    document.getElementById('f-assigned-d').value = '';
    document.getElementById('f-effort').value   = '';
    document.getElementById('f-date').value     = '';
    document.getElementById('f-status-d').value = 'todo';
    document.getElementById('f-pri-d').value    = 'med';
  } else {
    const t = tasks.find(x => x.id === id); if (!t) return;
    document.getElementById('drawer-title').textContent = 'Edit task';
    document.getElementById('f-task').value     = t.task;
    document.getElementById('f-remarks').value  = t.remarks || '';
    document.getElementById('f-cat-d').value    = t.catId;
    document.getElementById('f-assigned-d').value = t.owner;
    document.getElementById('f-effort').value   = t.effort || '';
    document.getElementById('f-date').value     = t.date || '';
    document.getElementById('f-status-d').value = t.status;
    document.getElementById('f-pri-d').value    = t.pri || 'med';
  }
  document.getElementById('task-overlay').classList.add('open');
  setTimeout(() => document.getElementById('f-task').focus(), 80);
}

function closeDrawer() { document.getElementById('task-overlay').classList.remove('open'); }

function saveTask() {
  const task = document.getElementById('f-task').value.trim();
  if (!task) { document.getElementById('f-task').focus(); toast('Task description is required'); return; }
  const data = {
    task, remarks: document.getElementById('f-remarks').value.trim(),
    catId: document.getElementById('f-cat-d').value,
    owner: document.getElementById('f-assigned-d').value.trim(),
    effort: document.getElementById('f-effort').value.trim(),
    date: document.getElementById('f-date').value.trim(),
    status: document.getElementById('f-status-d').value,
    pri: document.getElementById('f-pri-d').value,
  };
  if (editId !== null) {
    const targetId = String(editId);
    const t = tasks.find(x => x.id === targetId); if (t) Object.assign(t, data);
    toast('Task updated');
  } else {
    const newId = generateTaskId();
    tasks.push({id: newId, ...data}); toast('Task added');
  }
  closeDrawer(); render(); scheduleSave();
}

// ── Categories ─────────────────────────────────────────────────────────────
function openCatModal() { renderCatList(); document.getElementById('cat-overlay').classList.add('open'); }
function closeCatModal() { document.getElementById('cat-overlay').classList.remove('open'); }
function renderCatList() {
  document.getElementById('cat-list').innerHTML = categories.map(c => `
    <div class="cat-item">
      <span class="cat-dot" style="background:${c.color};width:12px;height:12px;border-radius:50%"></span>
      <span class="cat-item-name">${c.name}</span>
      <span class="cat-item-count">${tasks.filter(t=>t.catId===c.id).length} tasks</span>
      <button class="icon-btn del" onclick="deleteCat('${c.id}')" title="Delete">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
      </button>
    </div>`).join('');
}
function renderSwatches() {
  const g = document.getElementById('swatch-grid'); if (!g) return;
  g.innerHTML = COLORS.map(c => `<div class="swatch ${c===newCatColor?'sel':''}" style="background:${c}" onclick="pickColor('${c}')"></div>`).join('');
}
function pickColor(c) { newCatColor = c; renderSwatches(); }
function addCategory() {
  const name = document.getElementById('nc-name').value.trim(); if (!name) return;
  categories.push({id:'c'+(Date.now()), name, color:newCatColor});
  document.getElementById('nc-name').value = '';
  renderCatList(); render(); scheduleSave(); toast('Category added: ' + name);
}
function deleteCat(id) {
  const usage = tasks.filter(t => t.catId === id).length;
  if (usage > 0 && !confirm(`${usage} task(s) use this category. Continue?`)) return;
  categories = categories.filter(c => c.id !== id);
  tasks.forEach(t => { if (t.catId === id) t.catId = categories[0]?.id || ''; });
  renderCatList(); render(); scheduleSave(); toast('Category deleted');
}

// ── Meetings ───────────────────────────────────────────────────────────────
function updateMeetingNav() {
  const el = document.getElementById('nc-meetings');
  if (el) el.textContent = meetings.length;
}

function updateMeetingStats() {
  const total     = meetings.length;
  const allPoints = meetings.flatMap(m => m.points || []);
  const actions   = allPoints.filter(p => p.type === 'action').length;
  const decisions = allPoints.filter(p => p.type === 'decision').length;
  const open      = allPoints.filter(p => p.type === 'action' && !p.done).length;
  document.getElementById('ms-total').textContent     = total;
  document.getElementById('ms-action').textContent    = actions;
  document.getElementById('ms-decisions').textContent = decisions;
  document.getElementById('ms-open').textContent      = open;
  if (total) {
    document.getElementById('msb-action').style.width = Math.round(actions / Math.max(allPoints.length,1) * 100) + '%';
    document.getElementById('msb-dec').style.width    = Math.round(decisions / Math.max(allPoints.length,1) * 100) + '%';
    document.getElementById('msb-open').style.width   = Math.round(open / Math.max(actions,1) * 100) + '%';
  }
}

function renderMeetings() {
  updateMeetingStats();
  updateMeetingNav();
  const q  = (document.getElementById('m-search')||{}).value?.toLowerCase() || '';
  const ft = (document.getElementById('m-f-type')||{}).value || '';
  const fs = (document.getElementById('m-f-status')||{}).value || '';
  const fd = (document.getElementById('m-f-date')||{}).value || '';

  let list = meetings.filter(m => {
    if (q && !m.title.toLowerCase().includes(q) && !(m.agenda||'').toLowerCase().includes(q)
        && !(m.attendees||'').toLowerCase().includes(q)
        && !(m.points||[]).some(p => p.text.toLowerCase().includes(q))) return false;
    if (ft && m.type !== ft) return false;
    if (fs === 'open'   && !(m.points||[]).some(p => p.type === 'action' && !p.done)) return false;
    if (fs === 'closed' &&  (m.points||[]).some(p => p.type === 'action' && !p.done)) return false;
    if (fd) {
      const d = new Date(m.date); if (isNaN(d.getTime())) return false;
      const now = new Date(); now.setHours(0,0,0,0);
      const endOfWeek  = new Date(now); endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
      const endOfMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
      if (fd === 'today'      && d.toDateString() !== now.toDateString()) return false;
      if (fd === 'this-week'  && (d < now || d > endOfWeek)) return false;
      if (fd === 'this-month' && (d < now || d > endOfMonth)) return false;
    }
    return true;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  const container = document.getElementById('meetings-list');
  const empty = document.getElementById('meetings-empty');
  if (!list.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  container.innerHTML = list.map(m => {
    const points = m.points || [];
    const openActions = points.filter(p => p.type === 'action' && !p.done).length;
    const typeLabel = m.type ? (m.type.charAt(0).toUpperCase() + m.type.slice(1)) : 'Other';
    const typeClass = MT_CLASS[m.type] || 'mt-other';
    const dateStr = m.date ? (() => {
      const d = new Date(m.date); if (isNaN(d.getTime())) return m.date;
      return d.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
    })() : '';
    const previewPoints = points.slice(0, 3);
    return `<div class="meeting-card" onclick="openMeetingDetail(${m.id})">
      <div class="meeting-card-top">
        <div>
          <div class="meeting-card-title">${m.title}</div>
          <div class="meeting-card-meta">${dateStr}${m.attendees ? ' · ' + m.attendees : ''}</div>
        </div>
        <div class="meeting-card-badges">
          <span class="meeting-type-badge ${typeClass}">${typeLabel}</span>
          ${openActions > 0 ? `<span class="meeting-type-badge" style="background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-bd)">${openActions} open</span>` : ''}
        </div>
      </div>
      ${m.agenda ? `<div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.5">${m.agenda.slice(0,120)}${m.agenda.length>120?'…':''}</div>` : ''}
      <div class="meeting-card-points">
        ${previewPoints.map(p => `<div class="meeting-point-preview">
          <span class="mp-type-tag ${PT_CLASS[p.type]||'mp-note'}">${POINT_TYPES[p.type]||p.type}</span>
          <span style="${p.done?'text-decoration:line-through;color:var(--text3)':''}">${p.text.slice(0,80)}${p.text.length>80?'…':''}</span>
          ${p.type==='action'&&!p.done?'<span class="mp-open-dot"></span>':''}
        </div>`).join('')}
        ${points.length > 3 ? `<div style="font-size:11px;color:var(--text3);font-family:var(--mono)">+${points.length-3} more points</div>` : ''}
      </div>
      <div class="meeting-card-footer">
        <span class="meeting-card-attendees">${m.attendees || 'No attendees listed'}</span>
        <div class="meeting-card-counts">
          <span class="mcc-item">Points <span>${points.length}</span></span>
          <span class="mcc-item">Actions <span>${points.filter(p=>p.type==='action').length}</span></span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Meeting Drawer ─────────────────────────────────────────────────────────
function openMeetingDrawer(id) {
  editMeetingId = id;
  draftPoints = [];
  if (id === null) {
    document.getElementById('meeting-drawer-title').textContent = 'Add meeting';
    document.getElementById('m-title').value = '';
    document.getElementById('m-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('m-type').value = 'standup';
    document.getElementById('m-attendees').value = '';
    document.getElementById('m-agenda').value = '';
    draftPoints = [{type:'note',text:'',owner:'',done:false}];
  } else {
    const m = meetings.find(x => x.id === id); if (!m) return;
    document.getElementById('meeting-drawer-title').textContent = 'Edit meeting';
    document.getElementById('m-title').value = m.title;
    document.getElementById('m-date').value = m.date || '';
    document.getElementById('m-type').value = m.type || 'other';
    document.getElementById('m-attendees').value = m.attendees || '';
    document.getElementById('m-agenda').value = m.agenda || '';
    draftPoints = (m.points || []).map(p => ({...p}));
    if (!draftPoints.length) draftPoints.push({type:'note',text:'',owner:'',done:false});
  }
  renderDraftPoints();
  document.getElementById('meeting-overlay').classList.add('open');
  setTimeout(() => document.getElementById('m-title').focus(), 80);
}

function closeMeetingDrawer() { document.getElementById('meeting-overlay').classList.remove('open'); }

function renderDraftPoints() {
  const list = document.getElementById('m-points-list');
  list.innerHTML = draftPoints.map((p, i) => `
    <div class="m-point-row">
      <select class="m-point-type-sel" onchange="draftPoints[${i}].type=this.value">
        ${Object.entries(POINT_TYPES).map(([v,l]) => `<option value="${v}" ${p.type===v?'selected':''}>${l}</option>`).join('')}
      </select>
      <textarea class="m-point-text-inp" rows="1" placeholder="Point description..." oninput="draftPoints[${i}].text=this.value;autoResize(this)">${p.text||''}</textarea>
      <input class="m-point-owner-inp" type="text" placeholder="Owner" value="${p.owner||''}" oninput="draftPoints[${i}].owner=this.value">
      <button class="m-point-status-btn" onclick="draftPoints[${i}].done=!draftPoints[${i}].done;renderDraftPoints()" title="${p.done?'Mark open':'Mark done'}">
        ${p.done
          ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4ade80" stroke-width="2"><circle cx="8" cy="8" r="6"/><polyline points="5.5,8 7.5,10 10.5,6"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#5e5c6e" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg>'}
      </button>
      <button class="m-point-del-btn" onclick="draftPoints.splice(${i},1);renderDraftPoints()" title="Remove">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
      </button>
    </div>`).join('');
  // auto-resize all textareas
  list.querySelectorAll('.m-point-text-inp').forEach(ta => autoResize(ta));
}

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function addMeetingPoint() {
  draftPoints.push({type:'action',text:'',owner:'',done:false});
  renderDraftPoints();
  const textareas = document.getElementById('m-points-list').querySelectorAll('.m-point-text-inp');
  if (textareas.length) textareas[textareas.length-1].focus();
}

function saveMeeting() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) { document.getElementById('m-title').focus(); toast('Meeting title is required'); return; }
  const data = {
    title,
    date:      document.getElementById('m-date').value,
    type:      document.getElementById('m-type').value,
    attendees: document.getElementById('m-attendees').value.trim(),
    agenda:    document.getElementById('m-agenda').value.trim(),
    points:    draftPoints.filter(p => p.text.trim()),
  };
  if (editMeetingId !== null) {
    const m = meetings.find(x => x.id === editMeetingId); if (m) Object.assign(m, data);
    toast('Meeting updated');
  } else {
    meetings.push({id: nmid++, ...data}); toast('Meeting saved');
  }
  closeMeetingDrawer(); renderMeetings(); scheduleSave();
}

function delMeeting(id) {
  if (!confirm('Delete this meeting?')) return;
  meetings = meetings.filter(x => x.id !== id);
  closeMeetingDetail(); renderMeetings(); scheduleSave(); toast('Meeting deleted');
}

function editMeeting(id) { closeMeetingDetail(); openMeetingDrawer(id); }

// ── Meeting Detail ─────────────────────────────────────────────────────────
function openMeetingDetail(id) {
  currentMeetingId = id;
  const m = meetings.find(x => x.id === id); if (!m) return;
  document.getElementById('md-title').textContent = m.title;
  const dateStr = m.date ? new Date(m.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '';
  document.getElementById('md-meta').textContent = [dateStr, m.attendees].filter(Boolean).join(' · ');
  const body = document.getElementById('md-body');
  const points = m.points || [];
  const grouped = {};
  points.forEach(p => { if (!grouped[p.type]) grouped[p.type]=[]; grouped[p.type].push(p); });
  let html = '';
  if (m.agenda) {
    html += `<div class="md-section"><div class="md-section-title">Agenda / context</div><div class="md-agenda">${m.agenda}</div></div>`;
  }
  Object.entries(POINT_TYPES).forEach(([type, label]) => {
    const pts = grouped[type] || [];
    if (!pts.length) return;
    html += `<div class="md-section"><div class="md-section-title">${label}s (${pts.length})</div>`;
    pts.forEach((p, pi) => {
      const ptIdx = points.indexOf(p);
      html += `<div class="md-point ${p.done?'done':''}">
        <button class="md-toggle-btn" onclick="toggleMeetingPoint(${id},${ptIdx})" title="${p.done?'Mark open':'Mark done'}">
          ${p.done
            ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4ade80" stroke-width="2"><circle cx="8" cy="8" r="6"/><polyline points="5.5,8 7.5,10 10.5,6"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#5e5c6e" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg>'}
        </button>
        <div>
          <div class="md-point-text ${p.done?'done-text':''}">${p.text}</div>
          ${p.owner ? `<div class="md-point-owner">${p.owner}</div>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
  });
  if (!points.length) html = '<div style="color:var(--text3);font-size:13px;padding:20px 0">No meeting points added.</div>';
  html += `<div style="margin-top:16px;display:flex;gap:8px">
    <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:var(--red-bd)" onclick="delMeeting(${id})">Delete meeting</button>
  </div>`;
  body.innerHTML = html;
  document.getElementById('meeting-detail-overlay').classList.add('open');
}

function closeMeetingDetail() {
  document.getElementById('meeting-detail-overlay').classList.remove('open');
  currentMeetingId = null;
}

function toggleMeetingPoint(meetingId, pointIdx) {
  const m = meetings.find(x => x.id === meetingId); if (!m || !m.points[pointIdx]) return;
  m.points[pointIdx].done = !m.points[pointIdx].done;
  openMeetingDetail(meetingId);
  renderMeetings(); scheduleSave();
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDrawer(); closeCatModal(); closeMeetingDrawer(); closeMeetingDetail(); }
  if ((e.metaKey||e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (currentSection==='meetings') openMeetingDrawer(null); else openDrawer(null); }
  if ((e.metaKey||e.ctrlKey) && e.key === 's') { e.preventDefault(); syncNow(); }
});