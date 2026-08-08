'use strict';
// =====================================================================
// settings.js — profile + location settings (R27, self-contained labels)
// Full editable profile: name, bio, avatar, multiple cities, areas.
// GPS snaps to the nearest real Israeli city.
// =====================================================================

const DEFAULT_SETTINGS = { name: '', bio: '', avatarSeed: '', cities: [], areas: [], onlyMyArea: true };

// Label with Hebrew fallback if the i18n key isn't present yet.
function _L(key, he) { try { const v = t(key); return (v && v !== key) ? v : he; } catch (e) { return he; } }

const IL_CITIES = [
  ['תל אביב', 32.0853, 34.7818], ['ירושלים', 31.7683, 35.2137], ['חיפה', 32.7940, 34.9896],
  ['ראשון לציון', 31.9730, 34.8066], ['פתח תקווה', 32.0840, 34.8878], ['אשדוד', 31.8014, 34.6435],
  ['נתניה', 32.3215, 34.8532], ['באר שבע', 31.2530, 34.7915], ['בני ברק', 32.0807, 34.8338],
  ['חולון', 32.0117, 34.7722], ['רמת גן', 32.0684, 34.8248], ['אשקלון', 31.6688, 34.5715],
  ['רחובות', 31.8928, 34.8113], ['בת ים', 32.0171, 34.7457], ['כפר סבא', 32.1750, 34.9070],
  ['הרצליה', 32.1624, 34.8447], ['חדרה', 32.4340, 34.9196], ['מודיעין', 31.8983, 35.0104],
  ['נצרת', 32.6996, 35.3035], ['לוד', 31.9520, 34.8955], ['רמלה', 31.9288, 34.8667],
  ['רעננה', 32.1848, 34.8713], ['גבעתיים', 32.0723, 34.8123], ['הוד השרון', 32.1568, 34.8890],
  ['כרמיאל', 32.9159, 35.2952], ['עכו', 32.9281, 35.0818], ['נהריה', 33.0058, 35.0949],
  ['טבריה', 32.7959, 35.5300], ['צפת', 32.9646, 35.4960], ['קרית שמונה', 33.2074, 35.5695],
  ['עפולה', 32.6078, 35.2897], ['בית שאן', 32.4969, 35.4997], ['דימונה', 31.0700, 35.0325],
  ['אילת', 29.5577, 34.9519], ['קרית גת', 31.6100, 34.7642], ['קרית מוצקין', 32.8386, 35.0745],
  ['קרית ביאליק', 32.8383, 35.0864], ['קרית אתא', 32.8006, 35.1104], ['קרית ים', 32.8489, 35.0688],
  ['מעלות תרשיחא', 33.0166, 35.2717], ['שפרעם', 32.8056, 35.1697], ['סחנין', 32.8647, 35.2969],
  ['נוף הגליל', 32.7100, 35.3170], ['יקנעם', 32.6614, 35.1104], ['מגדל העמק', 32.6753, 35.2410],
  ['אום אל פחם', 32.5197, 35.1522], ['טירת כרמל', 32.7606, 34.9718], ['נשר', 32.7657, 35.0442],
  ['בית שמש', 31.7497, 34.9886], ['אריאל', 32.1058, 35.1878], ['אור יהודה', 32.0300, 34.8500],
];
function _hav(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function nearestCity(lat, lng) {
  let best = null, bd = Infinity;
  for (const c of IL_CITIES) { const d = _hav(lat, lng, c[1], c[2]); if (d < bd) { bd = d; best = c[0]; } }
  return best;
}

function getSettings() {
  let s;
  try { s = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem('pagia_settings') || '{}')); }
  catch (e) { s = Object.assign({}, DEFAULT_SETTINGS); }
  if ((!s.cities || !s.cities.length) && s.city) s.cities = [s.city];
  if (!Array.isArray(s.cities)) s.cities = [];
  if (!Array.isArray(s.areas)) s.areas = [];
  return s;
}
function saveSettings(s) { try { localStorage.setItem('pagia_settings', JSON.stringify(s)); } catch (e) {} }

function avatarUrl(seedOrName) { return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(seedOrName || 'user'); }

function applyIdentity() {
  const s = getSettings();
  if (typeof ME === 'undefined') return;
  if (s.name) ME.name = s.name;
  if (s.bio) ME.bio = s.bio;
  if (s.avatarSeed) ME.avatar = avatarUrl(s.avatarSeed);
  else if (s.name) ME.avatar = avatarUrl(s.name);
  if (s.cities.length) ME.city = s.cities[0];
  const nameEl = document.getElementById('profile-name'); if (nameEl && s.name) nameEl.textContent = s.name;
  const bioEl = document.getElementById('profile-bio'); if (bioEl && s.bio) bioEl.textContent = s.bio;
  const locEl = document.getElementById('profile-location'); if (locEl && s.cities.length) locEl.textContent = '📍 ' + s.cities.join(' · ');
  document.querySelectorAll('.nav-avatar img, .profile-avatar').forEach(a => { a.src = ME.avatar; });
}

function notifAllowsLocation(loc) {
  const s = getSettings();
  if (!s.onlyMyArea) return true;
  const needles = s.cities.concat(s.areas).map(x => (x || '').trim()).filter(Boolean);
  if (!needles.length) return true;
  const hay = (loc || '').trim();
  if (!hay) return false;
  return needles.some(n => hay.includes(n));
}

async function detectLocation() {
  const addCity = c => {
    const el = document.getElementById('set-cities'); if (!el || !c) return;
    const list = el.value.split(',').map(x => x.trim()).filter(Boolean);
    if (!list.includes(c)) list.push(c);
    el.value = list.join(', ');
  };
  const viaIP = async () => {
    try {
      const r = await fetch('https://ipapi.co/json/'); const d = await r.json();
      if (d && (d.latitude || d.city)) {
        const c = (d.latitude && d.longitude) ? nearestCity(d.latitude, d.longitude) : d.city;
        addCity(c); showToast('✅ ' + _L('geo_found', 'זוהה') + ': ' + c); return true;
      }
    } catch (e) {}
    return false;
  };
  showToast('📍 ' + _L('geo_detecting', 'מזהה מיקום...'));
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      const c = nearestCity(pos.coords.latitude, pos.coords.longitude);
      if (c) { addCity(c); showToast('✅ ' + _L('geo_found', 'זוהה') + ': ' + c); }
      else if (!(await viaIP())) showToast('⚠️ ' + _L('geo_failed', 'לא הצלחתי לזהות'));
    }, async () => { if (!(await viaIP())) showToast('⚠️ ' + _L('geo_denied', 'הגישה נחסמה')); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  } else if (!(await viaIP())) showToast('⚠️ ' + _L('geo_unsupported', 'לא נתמך'));
}
window.detectLocation = detectLocation;

let _tmpAvatarSeed = null;
function shuffleAvatar() {
  _tmpAvatarSeed = 'a' + Math.random().toString(36).slice(2, 9);
  const img = document.getElementById('set-avatar-preview');
  if (img) img.src = avatarUrl(_tmpAvatarSeed);
}
window.shuffleAvatar = shuffleAvatar;

function openSettings() {
  const s = getSettings();
  _tmpAvatarSeed = s.avatarSeed || null;
  const esc = v => String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const curAvatar = avatarUrl(s.avatarSeed || s.name || 'user');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'settings-overlay';
  overlay.onclick = e => { if (e.target === overlay) closeSettings(); };
  overlay.innerHTML = '' +
    '<div class="modal post-modal">' +
      '<div class="modal-header">' +
        '<h3>⚙️ ' + _L('settings_title', 'הגדרות') + '</h3>' +
        '<button class="modal-close" onclick="closeSettings()">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="form-group" style="text-align:center">' +
          '<img id="set-avatar-preview" src="' + curAvatar + '" alt="" style="width:84px;height:84px;border-radius:50%;background:var(--bg-secondary)"/>' +
          '<div><button type="button" class="btn-secondary" style="margin-top:8px" onclick="shuffleAvatar()">🎲 ' + _L('avatar_shuffle', 'החלף תמונה') + '</button></div>' +
        '</div>' +
        '<div class="form-group"><label>' + _L('field_display_name', 'השם שלי') + '</label>' +
          '<input type="text" id="set-name" value="' + esc(s.name) + '" placeholder="' + _L('field_name_ph', 'איך יקראו לך') + '" /></div>' +
        '<div class="form-group"><label>' + _L('field_bio', 'תיאור קצר') + '</label>' +
          '<textarea id="set-bio" rows="2" placeholder="' + _L('field_bio_ph', 'כמה מילים על עצמך') + '">' + esc(s.bio) + '</textarea></div>' +
        '<div class="form-group"><label>' + _L('field_my_cities', 'הערים שלי') + '</label>' +
          '<input type="text" id="set-cities" value="' + esc(s.cities.join(', ')) + '" placeholder="כרמיאל, חיפה, עכו" />' +
          '<button type="button" class="btn-secondary" style="margin-top:8px;width:100%" onclick="detectLocation()">📍 ' + _L('geo_detect', 'זהה את המיקום שלי') + '</button>' +
          '<div style="color:var(--text-secondary);font-size:0.8rem;margin-top:6px">אפשר כמה ערים, הפרד בפסיקים. תקבל התראות מכולן. GPS מוסיף את העיר הקרובה.</div></div>' +
        '<div class="form-group"><label>' + _L('field_my_areas', 'שכונות / אזורים שלי') + '</label>' +
          '<input type="text" id="set-areas" value="' + esc(s.areas.join(', ')) + '" placeholder="מרכז העיר, רמת רבין" />' +
          '<div style="color:var(--text-secondary);font-size:0.8rem;margin-top:6px">הפרד בפסיקים.</div></div>' +
        '<div class="form-group"><label style="display:flex;align-items:center;gap:10px;cursor:pointer">' +
          '<input type="checkbox" id="set-only-area" ' + (s.onlyMyArea ? 'checked' : '') + ' />' +
          '<span>' + _L('notif_only_area', 'התראות רק מהאזור שלי') + '</span></label></div>' +
        '<button class="btn-primary" onclick="saveSettingsFromModal()">💾 ' + _L('save_changes', 'שמור שינויים') + '</button>' +
        ((typeof isLoggedIn === 'function' && isLoggedIn()) ? '<button class="btn-secondary" style="margin-top:10px;width:100%" onclick="closeSettings();logout()">🚪 ' + _L('logout', 'התנתק') + '</button>' : '') +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  const o = document.getElementById('settings-overlay');
  if (o) o.remove();
  document.body.style.overflow = '';
}

function saveSettingsFromModal() {
  const splitList = id => (document.getElementById(id).value || '').split(',').map(x => x.trim()).filter(Boolean);
  const s = {
    name: document.getElementById('set-name').value.trim(),
    bio: document.getElementById('set-bio').value.trim(),
    avatarSeed: _tmpAvatarSeed || '',
    cities: splitList('set-cities'),
    areas: splitList('set-areas'),
    onlyMyArea: document.getElementById('set-only-area').checked,
  };
  saveSettings(s);
  applyIdentity();
  try { renderFeed(); renderChatList(); updateProfileStats(); } catch (e) {}
  closeSettings();
  showToast('✅ ' + _L('settings_saved', 'ההגדרות נשמרו!'));
}

document.addEventListener('DOMContentLoaded', applyIdentity);

window.getSettings = getSettings;
window.notifAllowsLocation = notifAllowsLocation;
window.applyIdentity = applyIdentity;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettingsFromModal = saveSettingsFromModal;
