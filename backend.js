'use strict';
// =====================================================================
// backend.js — R15: Supabase multi-user backend
// Loads LAST (after app.js + feed-extras.js).
// Uses globals: pagiaPosts, stockPosts, publishPost, renderFeed,
// renderExpirySoon, renderDealsWidget, showToast, nextPostId, t.
// If config.js is not filled in (or no network) → silent local demo mode.
// =====================================================================

const BACKEND = { client: null, ready: false };
const CLIENT_ID = (() => {
  try {
    let v = localStorage.getItem('pagia_client_id');
    if (!v) { v = 'c' + Date.now() + Math.random().toString(36).slice(2, 8); localStorage.setItem('pagia_client_id', v); }
    return v;
  } catch (e) { return 'c' + Math.random().toString(36).slice(2, 10); }
})();

// Real online-presence tracking (keyed by client_id)
const ONLINE = new Set();
const LAST_SEEN = {};
window.userIsOnline = function (uid) { return ONLINE.has(String(uid).replace(/^db-/, '')); };
window.userLastSeen = function (uid) { return LAST_SEEN[String(uid).replace(/^db-/, '')] || null; };
function refreshPresenceUI() {
  try { renderChatList(); } catch (e) {}
  try {
    const cv = CONVERSATIONS.find(c => c.id === activeConvoId);
    const el = document.querySelector('.chat-window-status');
    if (cv && el && typeof chatStatus === 'function') {
      const st = chatStatus(cv);
      el.innerHTML = st.label;
      el.classList.toggle('is-online', st.online);
    }
  } catch (e) {}
}

function backendConfigured() {
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR-')
      && typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20 && !SUPABASE_ANON_KEY.includes('YOUR-');
}

// DB row → post object the UI understands
function rowToPost(r) {
  const user = {
    id: 'db-' + (r.client_id || 'anon'),
    name: r.user_name || 'משתמש',
    avatar: r.user_avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(r.user_name || 'anon')),
    city: r.location || '',
    isBusiness: !!r.is_business,
    bizName: r.biz_name || '',
  };
  const base = {
    id: nextPostId++, dbId: r.id, ownerUid: r.user_id || null, feedType: r.feed_type, user,
    product: r.product, category: r.category || '', emoji: r.emoji || '📦',
    image: r.media_url || null, mediaType: r.media_type || 'image',
    desc: r.description || r.product, location: r.location || '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    likes: 0, liked: false, saved: false,
    time: new Date(r.created_at).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
    comments: [], showComments: false,
  };
  if (r.feed_type === 'stock') {
    return Object.assign(base, {
      originalPrice: Number(r.original_price) || 0, salePrice: Number(r.sale_price) || 0,
      quantity: r.quantity || 1, discountPct: r.discount_pct || 0, free: false,
    });
  }
  return Object.assign(base, {
    expiry: r.expiry ? new Date(r.expiry) : addDays(1),
    price: Number(r.price) || 0, free: !!r.free,
  });
}

// Try uploading a data-URL to Storage; fall back to inline data-URL if small.
async function backendUploadMedia(dataUrl, mediaType) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = mediaType === 'video' ? 'mp4' : 'png';
    const name = 'p' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await BACKEND.client.storage.from('media').upload(name, blob, { contentType: blob.type || undefined });
    if (error) throw error;
    return BACKEND.client.storage.from('media').getPublicUrl(name).data.publicUrl;
  } catch (e) {
    console.warn('[backend] media upload failed, inlining if small:', e.message || e);
    return dataUrl.length < 300000 ? dataUrl : null;
  }
}

// Insert a locally-created post into the DB
async function backendPublish(post) {
  if (!BACKEND.ready) return;
  try {
    let mediaUrl = post.image;
    if (mediaUrl && mediaUrl.startsWith('data:')) {
      mediaUrl = await backendUploadMedia(mediaUrl, post.mediaType || 'image');
    }
    const row = {
      client_id: CLIENT_ID,
      user_id: (typeof ME !== 'undefined' ? ME.uid : null) || null,
      feed_type: post.feedType,
      product: post.product,
      category: post.category,
      emoji: post.emoji,
      media_url: mediaUrl,
      media_type: post.mediaType || 'image',
      description: post.desc,
      location: post.location,
      tags: post.tags || [],
      user_name: post.user.isBusiness ? (post.user.bizName || post.user.name) : post.user.name,
      user_avatar: post.user.avatar,
      is_business: !!post.user.isBusiness,
      biz_name: post.user.bizName || null,
    };
    if (post.feedType === 'pagia') {
      row.expiry = post.expiry instanceof Date ? post.expiry.toISOString().split('T')[0] : null;
      row.price = post.price || 0;
      row.free = !!post.free;
    } else {
      row.original_price = post.originalPrice || 0;
      row.sale_price = post.salePrice || 0;
      row.quantity = post.quantity || 1;
      row.discount_pct = post.discountPct || 0;
    }
    const { data, error } = await BACKEND.client.from('posts').insert(row).select('id').single();
    if (error) console.error('[backend] insert failed:', error.message);
    else { post.dbId = data.id; post.ownerUid = row.user_id; console.log('[backend] post synced to DB'); }
  } catch (e) {
    console.error('[backend] publish error:', e.message || e);
  }
}

// Wrap the existing publishPost: after local publish, sync to DB.
const _origPublishPost = publishPost;
publishPost = function () {
  const beforeP = pagiaPosts.length, beforeS = stockPosts.length;
  _origPublishPost();
  if (!BACKEND.ready) return;
  if (pagiaPosts.length > beforeP) backendPublish(pagiaPosts[0]);
  else if (stockPosts.length > beforeS) backendPublish(stockPosts[0]);
};

async function backendInit() {
  if (!backendConfigured()) { console.log('[backend] not configured — running in local demo mode'); return; }
  if (typeof supabase === 'undefined') { console.warn('[backend] supabase-js failed to load (offline?) — demo mode'); return; }
  try {
    BACKEND.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await BACKEND.client
      .from('posts').select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error('[backend] load failed:', error.message); return; }
    BACKEND.ready = true;
    console.log(`[backend] connected — ${data.length} posts loaded from DB`);

    // Real posts go on top of the demo posts
    const pag = data.filter(r => r.feed_type === 'pagia').map(rowToPost);
    const stk = data.filter(r => r.feed_type === 'stock').map(rowToPost);
    pagiaPosts.unshift(...pag);
    stockPosts.unshift(...stk);
    renderFeed(); renderExpirySoon(); renderDealsWidget();

    // Live updates: new posts from OTHER users appear instantly.
    // Notification fires ONLY if the post location matches the user's
    // city/areas settings (settings.js: notifAllowsLocation).
    BACKEND.client
      .channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        if (payload.new.client_id === CLIENT_ID) return; // our own echo
        const p = rowToPost(payload.new);
        (p.feedType === 'stock' ? stockPosts : pagiaPosts).unshift(p);
        const feedPage = document.getElementById('page-feed');
        if (feedPage && feedPage.classList.contains('active') && currentFeedType === p.feedType) renderFeed();
        renderExpirySoon(); renderDealsWidget();
        const allow = (typeof notifAllowsLocation === 'function') ? notifAllowsLocation(p.location) : true;
        if (allow) {
          showToast('🆕 ' + t('toast_new_live'));
          try {
            NOTIFICATIONS.unshift({ id: Date.now(), type: 'system', user: null,
              text: `${p.emoji} ${p.product} · 📍 ${p.location}`, time: 'עכשיו',
              unread: true, postId: p.id, feedType: p.feedType });
            updateNotifBadge();
            renderNotificationsPanel();
          } catch (e) {}
        }
      })
      .subscribe();

    // ---- REAL MULTI-USER CHAT (per-post rooms) ----
    BACKEND.client
      .channel('chat-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        const m = payload.new;
        if (m.client_id === CLIENT_ID) return;
        const time = new Date(m.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        let cv = CONVERSATIONS.find(c => c.room === m.room);
        if (!cv) {
          cv = { id: 'r' + m.room, room: m.room,
            user: { id: 'db-' + m.client_id, name: m.sender_name || 'משתמש', avatar: m.sender_avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(m.sender_name || 'u')), isBusiness: false },
            online: true, unread: 0, preview: '', time: 'עכשיו', messages: [] };
          CONVERSATIONS.unshift(cv);
        }
        cv.messages.push({ from: 'them', text: m.text || '', media: m.media_url || null, mediaType: m.media_type || 'image', time });
        cv.preview = m.media_url ? (m.media_type === 'video' ? '🎥' : '📷') : m.text; cv.time = 'עכשיו';
        if (activeConvoId === cv.id) {
          const el = document.getElementById('cm-' + cv.id);
          if (el) { el.innerHTML = buildMessages(cv); scrollToBottom('cm-' + cv.id); }
          if (BACKEND.signals) BACKEND.signals.send({ type: 'broadcast', event: 'read', payload: { room: cv.room, client: CLIENT_ID } });
        } else {
          cv.unread = (cv.unread || 0) + 1;
        }
        renderChatList();
        showToast('💬 ' + t('toast_new_msg', { x: m.sender_name || '' }));
        try {
          NOTIFICATIONS.unshift({ id: Date.now(), type: 'chat', user: cv.user, text: m.text.slice(0, 60), time: 'עכשיו', unread: true, postId: null });
          updateNotifBadge();
        } catch (e) {}
      })
      .subscribe();

    // ---- REAL ONLINE PRESENCE ----
    const presence = BACKEND.client.channel('presence-online', { config: { presence: { key: CLIENT_ID } } });
    presence.on('presence', { event: 'sync' }, () => {
      const state = presence.presenceState();
      ONLINE.clear();
      Object.keys(state).forEach(k => ONLINE.add(k));
      refreshPresenceUI();
    });
    presence.on('presence', { event: 'leave' }, ({ key }) => {
      LAST_SEEN[key] = Date.now();
      ONLINE.delete(key);
      refreshPresenceUI();
    });
    presence.subscribe(async status => {
      if (status === 'SUBSCRIBED') await presence.track({ name: ME.name, at: Date.now() });
    });

    // ---- TYPING + READ RECEIPTS (broadcast) ----
    BACKEND.signals = BACKEND.client.channel('chat-signals');
    BACKEND.signals
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.client === CLIENT_ID) return;
        const cv = CONVERSATIONS.find(c => c.room === payload.room);
        if (cv && activeConvoId === cv.id && typeof showTyping === 'function') showTyping(cv.id, payload.name);
      })
      .on('broadcast', { event: 'read' }, ({ payload }) => {
        if (payload.client === CLIENT_ID) return;
        const cv = CONVERSATIONS.find(c => c.room === payload.room);
        if (!cv) return;
        let changed = false;
        cv.messages.forEach(m => { if (m.from === 'me' && m.status !== 'read') { m.status = 'read'; changed = true; } });
        if (changed && activeConvoId === cv.id) {
          const el = document.getElementById('cm-' + cv.id);
          if (el) el.innerHTML = buildMessages(cv);
        }
      })
      .subscribe();
  } catch (e) {
    console.error('[backend] init error:', e.message || e);
  }
}

// ---- CHAT: load room history from DB ----
async function backendLoadChat(cv) {
  if (!BACKEND.ready || !cv.room) return;
  try {
    const { data, error } = await BACKEND.client
      .from('chat_messages').select('*')
      .eq('room', cv.room)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error || !data) return;
    if (data.length) {
      cv.messages = data.map(m => ({
        from: m.client_id === CLIENT_ID ? 'me' : 'them',
        text: m.text || '',
        media: m.media_url || null,
        mediaType: m.media_type || 'image',
        time: new Date(m.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      }));
      cv.preview = data[data.length - 1].text;
    }
    if (activeConvoId === cv.id) {
      const el = document.getElementById('cm-' + cv.id);
      if (el) { el.innerHTML = buildMessages(cv); scrollToBottom('cm-' + cv.id); }
    }
    renderChatList();
  } catch (e) { console.error('[backend] chat load error:', e.message || e); }
}

// Chat from a REAL (DB) post → bind the conversation to a DB room
const _origOpenChatFromPost = openChatFromPost;
openChatFromPost = function (id, ft) {
  _origOpenChatFromPost(id, ft);
  if (!BACKEND.ready) return;
  const post = getPost(id, ft);
  if (!post || !post.dbId) return; // demo post → local simulated chat
  const cv = CONVERSATIONS.find(c => c.user.id === post.user.id);
  if (cv && !cv.room) { cv.room = post.dbId; backendLoadChat(cv); }
};

// Sending: DB rooms → insert to DB (no fake auto-reply); demo → original behavior
const _origSendChat = sendChatMessage;
sendChatMessage = function (id) {
  const cv = CONVERSATIONS.find(c => c.id === id);
  if (!BACKEND.ready || !cv || !cv.room) { _origSendChat(id); return; }
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) { requireLogin('login_to_chat'); return; }
  const inp = document.getElementById('ci-chat-' + id);
  if (!inp || !inp.value.trim()) return;
  const text = inp.value.trim();
  cv.messages.push({ from: 'me', text, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), status: 'sent' });
  cv.preview = text; inp.value = ''; inp.style.height = 'auto';
  const msgs = document.getElementById('cm-' + id);
  if (msgs) { msgs.innerHTML = buildMessages(cv); scrollToBottom('cm-' + id); }
  renderChatList();
  BACKEND.client.from('chat_messages')
    .insert({ room: cv.room, client_id: CLIENT_ID, user_id: (ME.uid || null), sender_name: ME.name, sender_avatar: ME.avatar, text })
    .then(({ error }) => { if (error) console.error('[backend] chat send failed:', error.message); });
};

// Chat media: DB rooms → upload to storage + insert row; demo rooms → original local behavior
const _origDeliverChatMedia = deliverChatMedia;
deliverChatMedia = function (cv, src, type) {
  _origDeliverChatMedia(cv, src, type);   // show locally immediately
  if (!BACKEND.ready || !cv.room) return;
  (async () => {
    try {
      let url = src;
      if (src.startsWith('data:')) url = await backendUploadMedia(src, type);
      if (!url) { showToast('⚠️ ' + t('media_too_big')); return; }
      const { error } = await BACKEND.client.from('chat_messages')
        .insert({ room: cv.room, client_id: CLIENT_ID, user_id: (ME.uid || null), sender_name: ME.name, sender_avatar: ME.avatar, text: '', media_url: url, media_type: type });
      if (error) console.error('[backend] chat media failed:', error.message);
    } catch (e) { console.error('[backend] chat media error:', e.message || e); }
  })();
};

// Broadcast "typing" (throttled) — overrides the no-op stub in app.js
let _typingThrottle = 0;
window.chatTyping = function (id) {
  const cv = CONVERSATIONS.find(c => c.id === id);
  if (!BACKEND.signals || !cv || !cv.room) return;
  const now = Date.now();
  if (now - _typingThrottle < 1200) return;
  _typingThrottle = now;
  BACKEND.signals.send({ type: 'broadcast', event: 'typing', payload: { room: cv.room, client: CLIENT_ID, name: ME.name } });
};

// Mark the other user's messages as read when we open the conversation
const _origOpenConversation = openConversation;
openConversation = function (id) {
  _origOpenConversation(id);
  const cv = CONVERSATIONS.find(c => c.id === id);
  if (cv && cv.room && BACKEND.signals) {
    BACKEND.signals.send({ type: 'broadcast', event: 'read', payload: { room: cv.room, client: CLIENT_ID } });
  }
};

// Owner-only delete/update against the DB (RLS enforces ownership server-side)
const _origDeletePost = deletePost;
deletePost = function (id, ft) {
  const p = getPost(id, ft); if (!p) return;
  if (!BACKEND.ready || !p.dbId) { _origDeletePost(id, ft); return; }
  if (!confirm(t('delete_confirm'))) return;
  BACKEND.client.from('posts').delete().eq('id', p.dbId).then(({ error }) => {
    if (error) { showToast('⚠️ ' + t('delete_failed')); console.error('[backend] delete', error.message); return; }
    const arr = ft === 'stock' ? stockPosts : pagiaPosts;
    const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1);
    try { closeDetailModal(); } catch (e) {}
    renderFeed(); renderExpirySoon(); renderDealsWidget();
    showToast('🗑️ ' + t('post_deleted'));
  });
};

window.backendUpdatePost = function (p) {
  if (!BACKEND.ready || !p.dbId) return;
  const upd = { product: p.product, description: p.desc, location: p.location, category: p.category, emoji: p.emoji };
  if (p.feedType === 'pagia') { upd.price = p.price || 0; }
  else { upd.original_price = p.originalPrice || 0; upd.sale_price = p.salePrice || 0; upd.quantity = p.quantity || 1; upd.discount_pct = p.discountPct || 0; }
  BACKEND.client.from('posts').update(upd).eq('id', p.dbId).then(({ error }) => { if (error) console.error('[backend] update', error.message); });
};

document.addEventListener('DOMContentLoaded', backendInit, { once: true });
