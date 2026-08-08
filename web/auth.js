'use strict';
// =====================================================================
// auth.js — real login: Google OAuth + email/username signup+login.
// Loads after settings.js, before backend.js.
// Shares the Supabase session (localStorage) with backend.js's client,
// so authenticated inserts satisfy the owner-only RLS policies.
// =====================================================================

const AUTH = { client: null, user: null };
let _loginMode = 'login';

function _authConfigured() {
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR-')
      && typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20;
}
function isLoggedIn() { return !!AUTH.user; }
function requireLogin(reasonKey) {
  if (isLoggedIn()) return true;
  showToast('🔒 ' + t(reasonKey || 'login_required'));
  openLogin();
  return false;
}
function _val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }

// R35: sign-in and sign-up wait on the network. Without feedback the button
// looks dead and people press it again, firing a second request.
async function _busy(btn, label, fn) {
  if (!btn) return fn();
  if (btn.dataset.busy) return;            // already in flight — ignore repeats
  const original = btn.textContent;
  btn.dataset.busy = '1';
  btn.disabled = true;
  btn.classList.add('is-busy');
  btn.textContent = label;
  try { return await fn(); }
  finally {
    delete btn.dataset.busy;
    btn.disabled = false;
    btn.classList.remove('is-busy');
    btn.textContent = original;
  }
}

function applyAuthUser() {
  updateAuthUI();
  if (!AUTH.user) return;
  const u = AUTH.user, md = u.user_metadata || {};
  const name = md.name || md.full_name || md.user_name || (u.email ? u.email.split('@')[0] : 'משתמש');
  ME.name = name;
  ME.uid = u.id;
  ME.avatar = md.avatar_url || md.picture || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(name));
  const nameEl = document.getElementById('profile-name'); if (nameEl) nameEl.textContent = name;
  const locEl = document.getElementById('profile-location'); if (locEl && ME.city) locEl.textContent = '📍 ' + ME.city;
  document.querySelectorAll('.nav-avatar img, .profile-avatar').forEach(a => { a.src = ME.avatar; });
  // Let the user's own profile edits (settings) win over the account defaults.
  if (typeof applyIdentity === 'function') applyIdentity();
  try { renderFeed(); renderChatList(); updateProfileStats(); } catch (e) {}
}

function updateAuthUI() {
  const btn = document.getElementById('auth-btn');
  // textContent, not innerHTML — the display name comes from account metadata.
  if (btn) btn.textContent = isLoggedIn() ? ('👤 ' + ME.name) : ('🔑 ' + t('login'));
}

async function loginGoogle(ev) {
  if (!AUTH.client) return;
  await _busy(ev && ev.currentTarget, t('login_working'), async () => {
    const { error } = await AUTH.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
    if (error) showToast('⚠️ ' + error.message);
  });
}
async function signupEmail(ev) {
  const email = _val('login-email'), pass = _val('login-pass'), name = _val('login-name');
  if (!email || !pass || !name) { showToast('⚠️ ' + t('login_fill')); return; }
  await _busy(ev && ev.currentTarget, t('login_working'), async () => {
    const { data, error } = await AUTH.client.auth.signUp({ email, password: pass, options: { data: { name } } });
    if (error) { showToast('⚠️ ' + error.message); return; }
    if (data.session) location.reload();
    else { showToast('📧 ' + t('login_check_email')); closeLogin(); }
  });
}
async function loginEmail(ev) {
  const email = _val('login-email'), pass = _val('login-pass');
  if (!email || !pass) { showToast('⚠️ ' + t('login_fill')); return; }
  await _busy(ev && ev.currentTarget, t('login_working'), async () => {
    const { error } = await AUTH.client.auth.signInWithPassword({ email, password: pass });
    if (error) { showToast('⚠️ ' + error.message); return; }
    location.reload();
  });
}
async function logout() {
  if (AUTH.client) await AUTH.client.auth.signOut();
  location.reload();
}

function loginModalHTML() {
  const signup = _loginMode === 'signup';
  return `<div class="modal post-modal">
    <div class="modal-header"><h3>${signup ? t('signup_title') : t('login_title')}</h3><button class="modal-close" onclick="closeLogin()">✕</button></div>
    <div class="modal-body">
      <button class="btn-google" onclick="loginGoogle(event)"><span class="g-mark">G</span> ${t('login_google')}</button>
      <div class="auth-or"><span>${t('login_or')}</span></div>
      ${signup ? `<div class="form-group"><label>${t('field_display_name')}</label><input id="login-name" type="text" placeholder="${t('field_name_ph')}"/></div>` : ''}
      <div class="form-group"><label>${t('login_email')}</label><input id="login-email" type="email" autocomplete="email"/></div>
      <div class="form-group"><label>${t('login_pass')}</label><input id="login-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}"/></div>
      <button class="btn-primary" onclick="${signup ? 'signupEmail(event)' : 'loginEmail(event)'}">${signup ? t('signup_do') : t('login_do')}</button>
      <div class="auth-switch" onclick="toggleLoginMode()">${signup ? t('login_have') : t('login_need')}</div>
    </div></div>`;
}
function openLogin() {
  closeLogin();
  const o = document.createElement('div');
  o.className = 'modal-overlay'; o.id = 'login-overlay';
  o.onclick = e => { if (e.target === o) closeLogin(); };
  o.innerHTML = loginModalHTML();
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';
}
function toggleLoginMode() {
  _loginMode = _loginMode === 'signup' ? 'login' : 'signup';
  const o = document.getElementById('login-overlay');
  if (o) o.innerHTML = loginModalHTML();
}
function closeLogin() {
  const o = document.getElementById('login-overlay'); if (o) o.remove();
  document.body.style.overflow = '';
}
// The nav button: logged out → open login; logged in → open settings (with sign-out)
function authButtonClick() { isLoggedIn() ? openSettings() : openLogin(); }

document.addEventListener('DOMContentLoaded', async () => {
  updateAuthUI();
  if (typeof supabase === 'undefined' || !_authConfigured()) return;
  AUTH.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { data } = await AUTH.client.auth.getSession();
    AUTH.user = (data.session && data.session.user) || null;
    applyAuthUser();
    AUTH.client.auth.onAuthStateChange((_e, session) => {
      AUTH.user = (session && session.user) || null;
      applyAuthUser();
    });
  } catch (e) { console.error('[auth] init', e); }
});

window.isLoggedIn = isLoggedIn;
window.requireLogin = requireLogin;
window.openLogin = openLogin;
window.closeLogin = closeLogin;
window.toggleLoginMode = toggleLoginMode;
window.loginGoogle = loginGoogle;
window.loginEmail = loginEmail;
window.signupEmail = signupEmail;
window.logout = logout;
window.authButtonClick = authButtonClick;
