'use strict';
// =====================================================================
// settings.js — R16: user settings (location-based notifications)
// Loads after i18n.js/app.js, before backend.js.
// Stores: my city, my neighborhoods/areas, only-my-area toggle.
// backend.js consults notifAllowsLocation() before notifying.
// =====================================================================

const DEFAULT_SETTINGS = { name: '', city: '', areas: [], onlyMyArea: true };

// Apply the saved identity to ME so posts/chat/presence use a real, distinct name.
function applyIdentity() {
  const s = getSettings();
  if (typeof ME === 'undefined') return;
  if (s.name) {
    ME.name = s.name;
    ME.avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(s.name);
  }
  if (s.city) ME.city = s.city;
  const nameEl = document.getElementById('profile-name'); if (nameEl && s.name) nameEl.textContent = s.name;
  const locEl = document.getElementById('profile-location'); if (locEl && s.city) locEl.textContent = '📍 ' + s.city;
  if (s.name) document.querySelectorAll('.nav-avatar img, .profile-avatar').forEach(a => { a.src = ME.avatar; });
}

function getSettings() {
  try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem('pagia_settings') || '{}')); }
  catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
}
function saveSettings(s) {
  try { localStorage.setItem('pagia_settings', JSON.stringify(s)); } catch (e) {}
}

// Should a post at `loc` trigger a notification for this user?
function notifAllowsLocation(loc) {
  const s = getSettings();
  if (!s.onlyMyArea) return true;              // user chose: notify on everything
  const needles = [s.city].concat(s.areas || []).map(x => (x || '').trim()).filter(Boolean);
  if (!needles.length) return true;            // nothing configured yet — allow all
  const hay = (loc || '').trim();
  if (!hay) return false;
  return needles.some(n => hay.includes(n));
}

// Auto-detect location: try GPS, fall back to IP-based lookup (works everywhere, no permission).
async function detectLocation() {
  const setCity = c => { const el = document.getElementById('set-city'); if (el && c) el.value = c; };
  const addArea = a => { const el = document.getElementById('set-areas'); if (el && a && !el.value.includes(a)) el.value = (el.value ? el.value + ', ' : '') + a; };
  const viaIP = async () => {
    try {
      const r = await fetch('https://ipapi.co/json/');
      const d = await r.json();
      if (d && d.city) { setCity(d.city); if (d.region && d.region !== d.city) addArea(d.region); showToast('✅ ' + t('geo_found', { x: d.city })); return true; }
    } catch (e) {}
    return false;
  };
  showToast('📍 ' + t('geo_detecting'));
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=he`);
        const d = await r.json();
        const city = d.city || d.locality || d.principalSubdivision || '';
        if (city) { setCity(city); if (d.locality && d.locality !== city) addArea(d.locality); showToast('✅ ' + t('geo_found', { x: city })); }
        else if (!(await viaIP())) showToast('⚠️ ' + t('geo_failed'));
      } catch (e) { if (!(await viaIP())) showToast('⚠️ ' + t('geo_failed')); }
    }, async () => { if (!(await viaIP())) showToast('⚠️ ' + t('geo_denied')); }, { enableHighAccuracy: true, timeout: 10000 });
  } else {
    if (!(await viaIP())) showToast('⚠️ ' + t('geo_unsupported'));
  }
}
window.detectLocation = detectLocation;

function openSettings() {
  const s = getSettings();
  const esc = v => String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'settings-overlay';
  overlay.onclick = e => { if (e.target === overlay) closeSettings(); };
  overlay.innerHTML = `
    <div class="modal post-modal">
      <div class="modal-header">
        <h3>⚙️ ${t('settings_title')}</h3>
        <button class="modal-close" onclick="closeSettings()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>${t('field_display_name')}</label>
          <input type="text" id="set-name" value="${esc(s.name)}" placeholder="${t('field_name_ph')}" />
          <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:6px">${t('field_name_hint')}</div>
        </div>
        <div class="form-group">
          <label>${t('field_my_city')}</label>
          <input type="text" id="set-city" value="${esc(s.city)}" placeholder="${t('field_city_ph')}" />
          <button type="button" class="btn-secondary" style="margin-top:8px;width:100%" onclick="detectLocation()">📍 ${t('geo_detect')}</button>
        </div>
        <div class="form-group">
          <label>${t('field_my_areas')}</label>
          <input type="text" id="set-areas" value="${esc((s.areas || []).join(', '))}" placeholder="${t('field_areas_ph')}" />
          <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:6px">${t('field_areas_hint')}</div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" id="set-only-area" ${s.onlyMyArea ? 'checked' : ''} />
            <span>${t('notif_only_area')}</span>
          </label>
        </div>
        <button class="btn-primary" onclick="saveSettingsFromModal()">💾 ${t('save_changes')}</button>
        ${(typeof isLoggedIn === 'function' && isLoggedIn()) ? `<button class="btn-secondary" style="margin-top:10px;width:100%" onclick="closeSettings();logout()">🚪 ${t('logout')}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  const o = document.getElementById('settings-overlay');
  if (o) o.remove();
  document.body.style.overflow = '';
}

function saveSettingsFromModal() {
  const s = {
    name: document.getElementById('set-name').value.trim(),
    city: document.getElementById('set-city').value.trim(),
    areas: document.getElementById('set-areas').value.split(',').map(x => x.trim()).filter(Boolean),
    onlyMyArea: document.getElementById('set-only-area').checked,
  };
  saveSettings(s);
  applyIdentity();
  try { renderFeed(); renderChatList(); updateProfileStats(); } catch (e) {}
  closeSettings();
  showToast('✅ ' + t('settings_saved'));
}

document.addEventListener('DOMContentLoaded', applyIdentity);

window.getSettings = getSettings;
window.notifAllowsLocation = notifAllowsLocation;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettingsFromModal = saveSettingsFromModal;
