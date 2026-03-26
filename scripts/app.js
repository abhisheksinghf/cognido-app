// ── Constants ──────────────────────────────────────────────────────────────
const COLORS = ['#7c6ff7','#60a5fa','#4ade80','#fbbf24','#f87171','#f472b6','#2dd4bf','#fb923c','#c084fc','#94a3b8'];
const OC = {Abhishek:['#B5D4F4','#0C447C'],Hemanth:['#C0DD97','#27500A'],Both:['#3a3a4a','#9896a8']};
const SL = {todo:'To do',inprogress:'In progress',review:'In review',done:'Done',blocked:'Blocked'};
const SS = {
  todo:     'background:rgba(148,163,184,.09);color:#94a3b8;border:1px solid rgba(148,163,184,.2)',
  inprogress:'background:var(--blue-bg);color:var(--blue);border:1px solid var(--blue-bd)',
  review:   'background:var(--purple-bg);color:var(--purple);border:1px solid var(--purple-bd)',
  done:     'background:var(--green-bg);color:var(--green);border:1px solid var(--green-bd)',
  blocked:  'background:var(--red-bg);color:var(--red);border:1px solid var(--red-bd)',
};
const CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbyP93X33K2jCw0OwdAELZDTbBpKpGbJIlrU9xdC152TVIqxO66Bp9yt_Qjln6R7/exec',
  authStorageKey: 'cognido_auth',
  credentials: {username: 'cognido', password: 'task@123'}
};
const CYCLE = {todo:'inprogress',inprogress:'review',review:'done',done:'blocked',blocked:'todo'};
const DEFAULT_TASKS = [
  {id:0,task:'Checking the existing flow',remarks:'',catId:'c1',owner:'Both',effort:'2 days',date:'24-25 Mar',status:'done',pri:'med'},
  {id:1,task:'Warehouse queue details collection — table, view and screen details',remarks:'',catId:'c4',owner:'Abhishek',effort:'1 day',date:'26-Mar',status:'done',pri:'high'},
  {id:2,task:'Job creation — insert table details',remarks:'Job name: PROCESS_PREADVICE',catId:'c5',owner:'Hemanth',effort:'',date:'',status:'inprogress',pri:'high'},
  {id:3,task:'Package creation for the auto job — spec and body',remarks:'Package: PMPKS_PROCESS_PREADVICE',catId:'c5',owner:'Both',effort:'.5 day',date:'26-Mar',status:'inprogress',pri:'high'},
  {id:4,task:'Logic creation of batch job select query — preadvice indicator and postdays',remarks:'',catId:'c1',owner:'Hemanth',effort:'.5 day',date:'27-Mar',status:'todo',pri:'med'},
  {id:5,task:'Threshold availability check logic for posting preadvice transaction',remarks:'',catId:'c1',owner:'Abhishek',effort:'1 day',date:'27-Mar',status:'todo',pri:'high'},
  {id:6,task:'Logic to post transaction till account pending event for successfully checked contract',remarks:'',catId:'c1',owner:'Abhishek',effort:'1 day',date:'30-Mar',status:'todo',pri:'high'},
  {id:7,task:'Testing to check for account posting on value date',remarks:'',catId:'c3',owner:'Hemanth',effort:'1 day',date:'30-Mar',status:'todo',pri:'med'},
  {id:8,task:'Test a positive case on logic check — threshold amount success',remarks:'',catId:'c3',owner:'Hemanth',effort:'1 day',date:'31-Mar',status:'todo',pri:'med'},
  {id:9,task:'Test a negative case on logic check — threshold amount failure',remarks:'',catId:'c3',owner:'Abhishek',effort:'1 day',date:'31-Mar',status:'todo',pri:'med'},
  {id:10,task:'Sanity testing on auto job',remarks:'',catId:'c3',owner:'Both',effort:'3 days',date:'03-Apr',status:'todo',pri:'high'},
];
const DEFAULT_CATS = [
  {id:'c1',name:'Pre-advice',color:'#7c6ff7'},
  {id:'c2',name:'Environment',color:'#2dd4bf'},
  {id:'c3',name:'Testing',color:'#4ade80'},
  {id:'c4',name:'Database',color:'#60a5fa'},
  {id:'c5',name:'Package / Job',color:'#fbbf24'},
];

// ── State ──────────────────────────────────────────────────────────────────
let API_URL = CONFIG.apiUrl;
let tasks = [], categories = [], nid = 11;
let editId = null, currentView = 'all', newCatColor = COLORS[0];
let saveTimer = null;

// ── Init ───────────────────────────────────────────────────────────────────
window.onload = function() {
  renderSwatches();
  const authed = localStorage.getItem(CONFIG.authStorageKey) === 'yes';
  if (authed) {
    API_URL = CONFIG.apiUrl;
    showApp();
    loadFromSheet();
    return;
  }
  const userField = document.getElementById('login-username');
  const passField = document.getElementById('login-password');
  if (userField) {
    userField.focus();
  }
  if (passField) {
    passField.value = '';
  }
};


// ── Sheet connection ───────────────────────────────────────────────────────
function wiggle(el) {
  if (!el) return;
  el.classList.add('wiggle');
  setTimeout(() => el.classList.remove('wiggle'), 380);
}

function showApp() {
  document.getElementById('config-banner').style.display = 'none';
  const ac = document.getElementById('app-content');
  ac.style.display = 'flex';
  ac.style.flexDirection = 'column';
  ac.style.overflow = 'hidden';
  ac.style.flex = '1';
}

// ── API ────────────────────────────────────────────────────────────────────
function api(body) {
  return fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type':'text/plain;charset=utf-8'}
  }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function connectSheet() {
  const userEl = document.getElementById('login-username');
  const passEl = document.getElementById('login-password');
  const username = (userEl ? userEl.value : '').trim().toLowerCase();
  const password = passEl ? passEl.value : '';
  if (username !== CONFIG.credentials.username || password !== CONFIG.credentials.password) {
    toast('Access denied. Check your Cognido credentials.');
    wiggle(document.getElementById('config-banner'));
    if (passEl) passEl.focus();
    return;
  }
  if (!CONFIG.apiUrl || CONFIG.apiUrl.includes('YOUR_DEPLOYMENT_ID')) {
    toast('Configure CONFIG.apiUrl in cognido.js before logging in.');
    return;
  }
  API_URL = CONFIG.apiUrl;
  setSyncState('loading', 'Connecting...');
  api({action:'ping'}).then(r => {
    const success = r && (r.ok === true || r.status === 'success' || r.result === 'ok' || r.message === 'pong' || !r.error);
    if (success) {
      localStorage.setItem(CONFIG.authStorageKey, 'yes');
      if (passEl) passEl.value = '';
      showApp();
      loadFromSheet();
      toast('Welcome back, Cognido captain!');
    } else {
      setSyncState('error', 'Connection failed');
      toast('Could not reach the sheet. Double-check CONFIG.apiUrl.');
    }
  }).catch(() => {
    setSyncState('error', 'Connection failed');
    toast('Could not reach the sheet. Double-check CONFIG.apiUrl.');
  });
}

function loadFromSheet() {
  setSyncState('loading', 'Loading...');
  api({action:'load'}).then(data => {
    if (data.error) { setSyncState('error', 'Load error'); toast('Error: ' + data.error); return; }
    // First load: if sheet is empty, push defaults
    if (!data.tasks || data.tasks.length === 0) {
      tasks      = DEFAULT_TASKS;
      categories = DEFAULT_CATS;
      nid        = 11;
      pushAll();
    } else {
      tasks      = data.tasks.map(t => ({...t, id: parseInt(t.id)||0}));
      categories = data.categories || DEFAULT_CATS;
      nid        = (data.meta && data.meta.nextId) ? parseInt(data.meta.nextId) : (Math.max(...tasks.map(t=>t.id)) + 1);
      setSyncState('ok', 'Synced');
    }
    render();
  }).catch(() => { setSyncState('error', 'Network error'); });
}

function pushAll() {
  setSyncState('saving', 'Saving...');
  Promise.all([
    api({action:'saveTasks',      tasks}),
    api({action:'saveCategories', categories}),
    api({action:'saveMeta',       meta:{nextId:nid}}),
  ]).then(() => setSyncState('ok', 'Synced')).catch(() => setSyncState('error', 'Save failed'));
}

function scheduleSave() {
  setSyncState('saving', 'Saving...');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => pushAll(), 1200);
}

function syncNow() {
  clearTimeout(saveTimer);
  pushAll();
  toast('Synced to Google Sheet');
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
  document.getElementById('f-cat').value = '';
  render();
}

// ── Render ──────────────────────────────────────────────────────────────────
function getCat(id) { return categories.find(c => c.id === id) || {name:'?',color:'#888'}; }

function render() {
  updateStats();
  renderCatNav();
  const q  = (document.getElementById('search')||{}).value?.toLowerCase() || '';
  const fc = (document.getElementById('f-cat')||{}).value || '';
  const fo = (document.getElementById('f-owner')||{}).value || '';
  const fp = (document.getElementById('f-pri')||{}).value || '';

  let list = tasks.filter(t => {
    if (currentView !== 'all' && t.status !== currentView) return false;
    if (q  && !t.task.toLowerCase().includes(q) && !(t.remarks||'').toLowerCase().includes(q) && !(t.owner||'').toLowerCase().includes(q)) return false;
    if (fc && t.catId !== fc) return false;
    if (fo && t.owner !== fo) return false;
    if (fp && t.pri   !== fp) return false;
    return true;
  });

  const tb = document.getElementById('tbody');
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="20" cy="20" r="16"/><line x1="13" y1="20" x2="27" y2="20"/></svg><p>No tasks match the current filters</p></div></td></tr>`;
    return;
  }

  tb.innerHTML = list.map(t => {
    const cat  = getCat(t.catId);
    const oc   = OC[t.owner] || ['#3a3a4a','#aaa'];
    const init = t.owner === 'Both' ? 'B' : (t.owner||'?').slice(0,2).toUpperCase();
    const priC = t.pri === 'high' ? '#f87171' : t.pri === 'low' ? '#94a3b8' : '#fbbf24';
    return `<tr>
      <td><span class="id-chip">${t.id}</span></td>
      <td>
        <div class="task-text ${t.status==='done'?'task-done':''}">${t.task}</div>
        ${t.remarks ? `<div class="rmk-text">${t.remarks}</div>` : ''}
      </td>
      <td><span class="cat-badge" style="background:${cat.color}18;color:${cat.color};border:1px solid ${cat.color}30"><span style="width:5px;height:5px;border-radius:50%;background:${cat.color};display:inline-block;flex-shrink:0"></span>${cat.name}</span></td>
      <td><span class="owner-chip"><span class="av" style="background:${oc[0]};color:${oc[1]}">${init}</span><span style="font-size:12px">${t.owner}</span></span></td>
      <td style="font-size:12px;color:var(--text3);font-family:var(--mono)">${t.effort||'—'}</td>
      <td style="font-size:12px;color:var(--text3);font-family:var(--mono)">${t.date||'—'}</td>
      <td><span class="st-badge" style="${SS[t.status]||''}" onclick="cycleStatus(${t.id})" title="Click to cycle status">${SL[t.status]||t.status}</span></td>
      <td><span class="pri-dot" style="background:${priC}" title="${t.pri||'med'} priority"></span></td>
      <td><div class="act-row">
        <button class="icon-btn edit" onclick="openDrawer(${t.id})" title="Edit">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z"/></svg>
        </button>
        <button class="icon-btn del" onclick="delTask(${t.id})" title="Delete">
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
  const todo = tasks.filter(t => t.status === 'todo').length;
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
    categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      sel.appendChild(o);
    });
    sel.value = cur;
  }
  categories.forEach(c => {
    const count = tasks.filter(t => t.catId === c.id).length;
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.innerHTML = `<span class="cat-dot" style="background:${c.color}"></span>${c.name}<span class="nav-count">${count}</span>`;
    btn.onclick = () => {
      if (sel) { sel.value = c.id; }
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
  const sel = document.getElementById('f-cat-d');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '';
  categories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    sel.appendChild(o);
  });
  if (cur && categories.find(c=>c.id===cur)) sel.value = cur;
}

// ── CRUD ───────────────────────────────────────────────────────────────────
function cycleStatus(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.status = CYCLE[t.status] || 'todo';
  render(); scheduleSave();
  toast('Status → ' + SL[t.status]);
}

function delTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(x => x.id !== id);
  render(); scheduleSave(); toast('Task deleted');
}

function openDrawer(id) {
  editId = id;
  renderDrawerCats();
  if (id === null) {
    document.getElementById('drawer-title').textContent = 'Add task';
    document.getElementById('f-task').value    = '';
    document.getElementById('f-remarks').value = '';
    document.getElementById('f-cat-d').value   = categories[0]?.id || '';
    document.getElementById('f-owner-d').value = 'Both';
    document.getElementById('f-effort').value  = '';
    document.getElementById('f-date').value    = '';
    document.getElementById('f-status-d').value= 'todo';
    document.getElementById('f-pri-d').value   = 'med';
  } else {
    const t = tasks.find(x => x.id === id); if (!t) return;
    document.getElementById('drawer-title').textContent = 'Edit task';
    document.getElementById('f-task').value    = t.task;
    document.getElementById('f-remarks').value = t.remarks || '';
    document.getElementById('f-cat-d').value   = t.catId;
    document.getElementById('f-owner-d').value = t.owner;
    document.getElementById('f-effort').value  = t.effort || '';
    document.getElementById('f-date').value    = t.date   || '';
    document.getElementById('f-status-d').value= t.status;
    document.getElementById('f-pri-d').value   = t.pri    || 'med';
  }
  document.getElementById('task-overlay').classList.add('open');
  setTimeout(() => document.getElementById('f-task').focus(), 80);
}

function closeDrawer() { document.getElementById('task-overlay').classList.remove('open'); }

function saveTask() {
  const task = document.getElementById('f-task').value.trim();
  if (!task) { document.getElementById('f-task').focus(); toast('Task description is required'); return; }
  const data = {
    task,
    remarks:  document.getElementById('f-remarks').value.trim(),
    catId:    document.getElementById('f-cat-d').value,
    owner:    document.getElementById('f-owner-d').value,
    effort:   document.getElementById('f-effort').value.trim(),
    date:     document.getElementById('f-date').value.trim(),
    status:   document.getElementById('f-status-d').value,
    pri:      document.getElementById('f-pri-d').value,
  };
  if (editId !== null) {
    const t = tasks.find(x => x.id === editId);
    if (t) Object.assign(t, data);
    toast('Task updated');
  } else {
    tasks.push({id: nid++, ...data});
    toast('Task added');
  }
  closeDrawer(); render(); scheduleSave();
}

// ── Categories ─────────────────────────────────────────────────────────────
function openCatModal() { renderCatList(); document.getElementById('cat-overlay').classList.add('open'); }
function closeCatModal(){ document.getElementById('cat-overlay').classList.remove('open'); }

function renderCatList() {
  document.getElementById('cat-list').innerHTML = categories.map(c => `
    <div class="cat-item">
      <span class="cat-dot" style="background:${c.color};width:12px;height:12px;border-radius:50%"></span>
      <span class="cat-item-name">${c.name}</span>
      <span class="cat-item-count">${tasks.filter(t=>t.catId===c.id).length} tasks</span>
      <button class="icon-btn del" onclick="deleteCat('${c.id}')" title="Delete category">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
      </button>
    </div>`).join('');
}

function renderSwatches() {
  document.getElementById('swatch-grid').innerHTML = COLORS.map(c =>
    `<div class="swatch ${c===newCatColor?'sel':''}" style="background:${c}" onclick="pickColor('${c}')"></div>`
  ).join('');
}

function pickColor(c) { newCatColor = c; renderSwatches(); }

function addCategory() {
  const name = document.getElementById('nc-name').value.trim();
  if (!name) return;
  categories.push({id:'c'+(Date.now()), name, color: newCatColor});
  document.getElementById('nc-name').value = '';
  renderCatList(); render(); scheduleSave();
  toast('Category added: ' + name);
}

function deleteCat(id) {
  const usage = tasks.filter(t => t.catId === id).length;
  if (usage > 0 && !confirm(`${usage} task(s) use this category. They will be moved to the first category. Continue?`)) return;
  categories = categories.filter(c => c.id !== id);
  tasks.forEach(t => { if (t.catId === id) t.catId = categories[0]?.id || ''; });
  renderCatList(); render(); scheduleSave();
  toast('Category deleted');
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDrawer(); closeCatModal(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openDrawer(null); }
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); syncNow(); }
});

































