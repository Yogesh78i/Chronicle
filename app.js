// Chronicle — client-side application logic (no build step, plain JS).
'use strict';

const state = {
  user: null,
  character: null,
  tasks: [],
  shop: [],
  logs: []
};

const ATTR_LABELS = { intellect: 'Intellect', strength: 'Strength', spirit: 'Spirit', discipline: 'Discipline' };
const DIFF_LABELS = { trivial: 'Trivial', easy: 'Easy', medium: 'Medium', hard: 'Hard', epic: 'Epic' };

// ------------------------------------------------------------------ utils
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.remove('is-hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('is-hidden'), 3200);
}

function showLevelUp(newLevel) {
  const banner = $('#levelup-banner');
  banner.textContent = `✦ Level Up! You are now level ${newLevel} ✦`;
  banner.classList.remove('is-hidden');
  banner.style.animation = 'none';
  // restart animation
  void banner.offsetWidth;
  banner.style.animation = '';
  clearTimeout(showLevelUp._t);
  showLevelUp._t = setTimeout(() => banner.classList.add('is-hidden'), 2800);
}

// ------------------------------------------------------------------ auth view
function initAuthTabs() {
  const tabLogin = $('#tab-login');
  const tabRegister = $('#tab-register');
  const panelLogin = $('#panel-login');
  const panelRegister = $('#panel-register');

  function activate(which) {
    const loginActive = which === 'login';
    tabLogin.classList.toggle('is-active', loginActive);
    tabRegister.classList.toggle('is-active', !loginActive);
    tabLogin.setAttribute('aria-selected', String(loginActive));
    tabRegister.setAttribute('aria-selected', String(!loginActive));
    panelLogin.classList.toggle('is-hidden', !loginActive);
    panelRegister.classList.toggle('is-hidden', loginActive);
  }

  tabLogin.addEventListener('click', () => activate('login'));
  tabRegister.addEventListener('click', () => activate('register'));

  $('#panel-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = $('#login-error');
    errorEl.textContent = '';
    const identifier = $('#login-identifier').value.trim();
    const password = $('#login-password').value;
    try {
      const data = await Api.login({ identifier, password });
      onAuthSuccess(data);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  $('#panel-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = $('#register-error');
    errorEl.textContent = '';
    const username = $('#reg-username').value.trim();
    const email = $('#reg-email').value.trim();
    const password = $('#reg-password').value;
    try {
      const data = await Api.register({ username, email, password });
      onAuthSuccess(data);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

function onAuthSuccess(data) {
  localStorage.setItem('chronicle_token', data.token);
  state.user = data.user;
  state.character = data.character;
  enterApp();
}

function logout() {
  localStorage.removeItem('chronicle_token');
  state.user = null;
  state.character = null;
  state.tasks = [];
  $('#app-view').classList.add('is-hidden');
  $('#auth-view').classList.remove('is-hidden');
}

// ------------------------------------------------------------------ app shell
function initTabs() {
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  $$('.tab-btn').forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle('is-active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $$('.view').forEach((v) => v.classList.add('is-hidden'));
  $(`#view-${view}`).classList.remove('is-hidden');

  if (view === 'character') loadRecentLogs();
  if (view === 'shop') loadShop();
}

async function enterApp() {
  $('#auth-view').classList.add('is-hidden');
  $('#app-view').classList.remove('is-hidden');
  $('#char-username').textContent = state.user.username;
  renderCharacter();
  await loadTasks();
}

// ------------------------------------------------------------------ character rendering
function renderCharacter() {
  const c = state.character;
  if (!c) return;
  $('#char-level').textContent = c.level;
  $('#char-title').textContent = c.title;
  $('#char-gold').textContent = c.gold;
  $('#char-streak').textContent = c.currentStreak;
  $('#xp-current').textContent = c.xp;
  $('#xp-needed').textContent = c.xpToNext;

  const pct = Math.min(100, Math.round((c.xp / c.xpToNext) * 100));
  const fill = $('#xp-fill');
  fill.style.width = `${pct}%`;
  $('.xp-bar').setAttribute('aria-valuenow', String(pct));

  const attrs = c.attributes;
  const maxAttr = Math.max(10, ...Object.values(attrs));
  const listHtml = Object.entries(attrs)
    .map(([key, val]) => attributeRowHtml(key, val, maxAttr))
    .join('');
  $('#attribute-list').innerHTML = listHtml;
  $('#attribute-list-large').innerHTML = listHtml;

  $('#streak-big').textContent = c.currentStreak;
  $('#streak-longest').textContent = c.longestStreak;
}

function attributeRowHtml(key, value, maxAttr) {
  const pct = Math.min(100, Math.round((value / maxAttr) * 100));
  return `
    <li class="attr-${key}">
      <div class="attr-row-top"><span>${ATTR_LABELS[key]}</span><span>${value}</span></div>
      <div class="attr-bar"><div class="attr-bar-fill" style="width:${pct}%"></div></div>
    </li>`;
}

function pulseStats() {
  $$('.stat-pill').forEach((p) => {
    p.classList.remove('pulse');
    void p.offsetWidth;
    p.classList.add('pulse');
  });
}

// ------------------------------------------------------------------ quests
async function loadTasks() {
  try {
    const data = await Api.listTasks();
    state.tasks = data.tasks;
    renderTasks();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderTasks() {
  const active = state.tasks.filter((t) => t.status === 'active');
  const list = $('#quest-list');
  $('#quest-empty').classList.toggle('is-hidden', active.length > 0);

  list.innerHTML = active
    .map(
      (t) => `
      <article class="quest-row" data-difficulty="${t.difficulty}" data-id="${t.id}">
        <button class="quest-check" aria-label="Complete quest: ${escapeHtml(t.title)}"></button>
        <div class="quest-body">
          <p class="quest-title">${escapeHtml(t.title)}</p>
          <div class="quest-meta">
            <span class="quest-tag">${ATTR_LABELS[t.attribute]}</span>
            <span class="quest-tag">${DIFF_LABELS[t.difficulty]}</span>
            ${t.dueDate ? `<span class="quest-tag">Due ${t.dueDate}</span>` : ''}
          </div>
          ${t.notes ? `<p class="quest-notes">${escapeHtml(t.notes)}</p>` : ''}
        </div>
        <button class="quest-delete" aria-label="Delete quest: ${escapeHtml(t.title)}">✕</button>
      </article>`
    )
    .join('');

  $$('.quest-check', list).forEach((btn) => {
    btn.addEventListener('click', () => completeQuest(btn.closest('.quest-row')));
  });
  $$('.quest-delete', list).forEach((btn) => {
    btn.addEventListener('click', () => deleteQuest(btn.closest('.quest-row')));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function completeQuest(row) {
  const id = row.dataset.id;
  const checkBtn = $('.quest-check', row);
  checkBtn.classList.add('is-sealing');
  checkBtn.disabled = true;

  // Optimistic UI: fade the row out immediately, before the server confirms,
  // so completing a quest feels instant rather than waiting on network latency.
  setTimeout(() => row.classList.add('is-completing'), 250);

  try {
    const data = await Api.completeTask(id);
    state.character = data.character;
    state.tasks = state.tasks.map((t) => (String(t.id) === id ? data.task : t));
    renderCharacter();
    pulseStats();
    showToast(`+${data.reward.xpGain} XP · +${data.reward.goldGain} gold`);
    if (data.reward.leveledUp) showLevelUp(data.character.level);
    setTimeout(renderTasks, 420);
  } catch (err) {
    row.classList.remove('is-completing');
    checkBtn.classList.remove('is-sealing');
    checkBtn.disabled = false;
    showToast(err.message, true);
  }
}

async function deleteQuest(row) {
  const id = row.dataset.id;
  row.style.opacity = '0.4';
  try {
    await Api.deleteTask(id);
    state.tasks = state.tasks.filter((t) => String(t.id) !== id);
    renderTasks();
  } catch (err) {
    row.style.opacity = '1';
    showToast(err.message, true);
  }
}

function initQuestForm() {
  const form = $('#new-quest-form');
  const newBtn = $('#new-quest-btn');
  const cancelBtn = $('#cancel-quest-btn');

  newBtn.addEventListener('click', () => {
    form.classList.remove('is-hidden');
    newBtn.classList.add('is-hidden');
    $('#quest-title').focus();
  });
  cancelBtn.addEventListener('click', () => {
    form.reset();
    $('#quest-error').textContent = '';
    form.classList.add('is-hidden');
    newBtn.classList.remove('is-hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = $('#quest-error');
    errorEl.textContent = '';
    const payload = {
      title: $('#quest-title').value.trim(),
      notes: $('#quest-notes').value.trim(),
      attribute: $('#quest-attribute').value,
      difficulty: $('#quest-difficulty').value
    };
    if (!payload.title) {
      errorEl.textContent = 'A quest needs a title.';
      return;
    }
    try {
      const data = await Api.createTask(payload);
      state.tasks.unshift(data.task);
      renderTasks();
      form.reset();
      form.classList.add('is-hidden');
      newBtn.classList.remove('is-hidden');
      showToast('Quest added to your log.');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

// ------------------------------------------------------------------ character log
async function loadRecentLogs() {
  try {
    const data = await Api.recentLogs();
    state.logs = data.logs;
    const list = $('#recent-log');
    $('#log-empty').classList.toggle('is-hidden', data.logs.length > 0);
    list.innerHTML = data.logs
      .map(
        (l) => `<li><span>${escapeHtml(l.title)}</span><span class="log-reward">+${l.xp_gained} XP · +${l.gold_gained}g</span></li>`
      )
      .join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ------------------------------------------------------------------ shop
async function loadShop() {
  try {
    const data = await Api.listShop();
    state.shop = data.items;
    renderShop();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderShop() {
  const grid = $('#shop-grid');
  grid.innerHTML = state.shop
    .map((item) => {
      const affordable = state.character.gold >= item.cost;
      const disabled = item.owned || !affordable;
      let label = 'Buy';
      if (item.owned) label = 'Owned';
      else if (!affordable) label = 'Not enough gold';
      return `
        <article class="shop-card">
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.description)}</p>
          <p class="shop-cost">${item.cost} gold</p>
          <button class="btn btn-primary" data-id="${item.id}" ${disabled ? 'disabled' : ''}>${label}</button>
        </article>`;
    })
    .join('');

  $$('.shop-card button', grid).forEach((btn) => {
    btn.addEventListener('click', () => buyItem(btn.dataset.id));
  });
}

async function buyItem(id) {
  try {
    const data = await Api.buyItem(id);
    state.character = data.character;
    renderCharacter();
    pulseStats();
    showToast(`Acquired: ${data.item.name}`);
    await loadShop();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ------------------------------------------------------------------ boot
async function tryResumeSession() {
  const token = localStorage.getItem('chronicle_token');
  if (!token) return;
  try {
    const data = await Api.me();
    state.user = data.user;
    state.character = data.character;
    enterApp();
  } catch (_) {
    localStorage.removeItem('chronicle_token');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthTabs();
  initTabs();
  initQuestForm();
  $('#logout-btn').addEventListener('click', logout);
  tryResumeSession();
});
