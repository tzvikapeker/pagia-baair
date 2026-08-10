'use strict';
// =====================================================================
// backend.js — R15: Supabase multi-user backend
// Loads LAST (after app.js + feed-extras.js).
// Uses globals: pagiaPosts, stockPosts, publishPost, renderFeed,
// renderExpirySoon, renderDealsWidget, showToast, nextPostId, t.
// If config.js is not filled in (or no network) → silent local demo mode.
// =====================================================================

const BACKEND = { client: null, ready: false, pageSize: 30, loaded: 0, exhausted: false, realCount: { pagia: 0, stock: 0 } };
window.BACKEND = BACKEND;
let _convoSeq = 0;   // R40: safe, local conversation ids — never derived from anything a sender controls
// R35: set synchronously at load, before the first render — otherwise the feed
// paints "nobody has posted yet" for a second and then swaps in real posts,
// which reads as an empty app to anyone with a slow connection.
BACKEND.loading = (typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR-'));
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

// R41: the feed asked for whole rows. Measured against 300 listings at 60
// concurrent requests: select=* took 829ms and 33KB, the same query without
// the description took 209ms and 9KB. The description is three quarters of
// the weight for a card that shows two lines of it, so the feed reads the
// generated `summary` column and the full text is fetched on open.
const FEED_COLUMNS = [
  'id', 'created_at', 'user_id', 'client_id', 'feed_type', 'product', 'category', 'emoji',
  'media_url', 'media_type', 'summary', 'location', 'tags', 'taken',
  'likes_count', 'comments_count', 'expiry', 'price', 'free',
  'original_price', 'sale_price', 'quantity', 'discount_pct',
  'user_name', 'user_avatar', 'is_business', 'biz_name',
].join(',');

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
    // `summary` when it came from the feed, `description` when the full row
    // was fetched. _fullDesc records which, so openDetail knows to top it up.
    desc: r.description || r.summary || r.product,
    _fullDesc: r.description != null,
    location: r.location || '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    taken: !!r.taken,
    // R37: counts arrive with the row, maintained by a trigger
    likes: Number(r.likes_count) || 0,
    commentCount: Number(r.comments_count) || 0,
    liked: false, saved: false,
    time: new Date(r.created_at).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
    comments: [], showComments: false,
  };
  if (r.feed_type === 'stock') {
    // Numeric fields are coerced here (not at render time) so nothing that ends
    // up interpolated into HTML can arrive as a string from the DB.
    return Object.assign(base, {
      originalPrice: Number(r.original_price) || 0, salePrice: Number(r.sale_price) || 0,
      quantity: Number(r.quantity) || 1, discountPct: Number(r.discount_pct) || 0, free: false,
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
    if (error) {
      // R40: this used to be a console line. The listing stayed on screen with
      // a "published!" toast while the server had rejected it — hit the rate
      // limit and you were told you'd posted when you hadn't.
      console.error('[backend] insert failed:', error.message);
      const arr = post.feedType === 'stock' ? stockPosts : pagiaPosts;
      const i = arr.indexOf(post); if (i >= 0) arr.splice(i, 1);
      showToast('⚠️ ' + friendlyError(error));
      renderFeed(); renderExpirySoon(); renderDealsWidget();
      try { updateProfileStats(); } catch (e) {}
      return;
    }
    post.dbId = data.id;
    post.ownerUid = row.user_id;
    // R40: liveFiltered() hides anything without a dbId once a backend is
    // connected, so between the local insert and this line the new listing was
    // invisible — the author published and watched nothing appear.
    renderFeed(); renderExpirySoon(); renderDealsWidget();
    try { updateProfileStats(); renderProfileGrid(post.feedType); renderSidebarStats(); renderLeaderboard(); } catch (e) {}
    console.log('[backend] post synced to DB');
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

// R30: demo mode used to be announced only in the console, so when the backend
// was unreachable the app looked completely normal — full of demo listings that
// a visitor would take for real ones. Now it says so on screen.
function showDemoBanner(reason) {
  // whatever the reason, we are no longer waiting for the server
  BACKEND.loading = false;
  try { renderFeed(); } catch (e) {}
  if (document.getElementById('demo-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'demo-banner';
  bar.className = 'demo-banner';
  const label = document.createElement('span');
  label.textContent = (typeof t === 'function' ? t('demo_mode') : 'מצב דמו — אין חיבור לשרת');
  const why = document.createElement('span');
  why.className = 'demo-banner-why';
  why.textContent = reason || '';
  const close = document.createElement('button');
  close.className = 'demo-banner-close';
  close.setAttribute('aria-label', 'סגור');
  close.textContent = '✕';
  close.onclick = () => bar.remove();
  bar.appendChild(label);
  if (reason) bar.appendChild(why);
  bar.appendChild(close);
  document.body.appendChild(bar);
}

async function backendInit() {
  if (!backendConfigured()) { console.log('[backend] not configured — running in local demo mode'); showDemoBanner('config.js'); return; }
  if (typeof supabase === 'undefined') { console.warn('[backend] supabase-js failed to load (offline?) — demo mode'); showDemoBanner('supabase-js'); return; }
  try {
    // Reuse auth.js's client instead of creating a second one. Two clients
    // sharing the same auth storage key made supabase-js warn about "Multiple
    // GoTrueClient instances", and meant the two could disagree about the
    // session — inserts here would then fail the owner-only RLS checks.
    // auth.js loads first and assigns AUTH.client synchronously, so it's ready.
    BACKEND.client = (typeof AUTH !== 'undefined' && AUTH.client)
      ? AUTH.client
      : supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await BACKEND.client
      .from('posts').select(FEED_COLUMNS)
      .order('created_at', { ascending: false })
      .range(0, BACKEND.pageSize - 1);
    if (error) { console.error('[backend] load failed:', error.message); showDemoBanner(error.message); return; }
    BACKEND.ready = true;
    BACKEND.loading = false;
    // R33: the app ships with demo notifications and demo conversations so the
    // offline build feels populated. On a live backend they are fiction — a
    // first-time visitor was shown "2 unread" and messages from people who
    // don't exist. Real ones arrive from the DB and over realtime.
    try {
      if (typeof NOTIFICATIONS !== 'undefined') { NOTIFICATIONS.length = 0; updateNotifBadge(); renderNotificationsPanel(); }
      if (typeof CONVERSATIONS !== 'undefined') { CONVERSATIONS.length = 0; renderChatList(); }
    } catch (e) {}
    BACKEND.loaded = data.length;
    BACKEND.exhausted = data.length < BACKEND.pageSize;
    console.log(`[backend] connected — ${data.length} posts loaded from DB`);

    // Real posts go on top of the demo posts
    const pag = data.filter(r => r.feed_type === 'pagia').map(rowToPost);
    const stk = data.filter(r => r.feed_type === 'stock').map(rowToPost);
    pagiaPosts.unshift(...pag);
    stockPosts.unshift(...stk);
    BACKEND.realCount.pagia = pag.length;
    BACKEND.realCount.stock = stk.length;
    renderFeed(); renderExpirySoon(); renderDealsWidget();
    try { updateProfileStats(); renderSidebarStats(); renderLeaderboard(); } catch (e) {}
    backendHydrateSocial(pag.concat(stk)).then(() => renderFeed());
    loadBlocks();   // R39: apply this account's block list to what's on screen

    // Live updates: new posts from OTHER users appear instantly.
    // Notification fires ONLY if the post location matches the user's
    // city/areas settings (settings.js: notifAllowsLocation).
    BACKEND.feedChannel = BACKEND.client
      .channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        if (payload.new.client_id === CLIENT_ID) return; // our own echo
        const p = rowToPost(payload.new);
        // R37: a listing three cities away should not push itself into your
        // feed. Only what matches your settings gets inserted live; everything
        // else is simply skipped, which is also what keeps the fan-out sane.
        const relevant = (typeof notifAllowsLocation === 'function') ? notifAllowsLocation(p.location) : true;
        if (!relevant) return;
        (p.feedType === 'stock' ? stockPosts : pagiaPosts).unshift(p);
        BACKEND.realCount[p.feedType === 'stock' ? 'stock' : 'pagia']++;
        BACKEND.loaded++;
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
          // R40: the id goes straight into DOM ids and inline handlers, so it
          // must never carry anything a sender controls. `room` is free text
          // chosen by whoever sent the message — using it here let an attacker
          // close the attribute and inject markup into the recipient's page.
          cv = { id: 'r' + (++_convoSeq), room: m.room,
            user: { id: 'db-' + m.client_id, name: m.sender_name || 'משתמש', avatar: m.sender_avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(m.sender_name || 'u')), isBusiness: false },
            online: true, unread: 0, preview: '', time: 'עכשיו', messages: [] };
          // The room is "<postId>:<buyer>", so the seller's side can show which
          // product this thread is about instead of a nameless conversation.
          cv.buyerKey = m.buyer_key || String(m.room).split(':')[1] || null;
          cv.sellerUid = m.seller_uid || null;
          const postDbId = String(m.room).split(':')[0];
          const src = pagiaPosts.concat(stockPosts).find(p => String(p.dbId) === postDbId);
          if (src) cv.post = { id: src.id, feedType: src.feedType, product: src.product, emoji: src.emoji,
            image: src.image, mediaType: src.mediaType,
            price: src.feedType === 'stock' ? ('₪' + src.salePrice) : (src.free ? t('price_free') : ('₪' + src.price)) };
          CONVERSATIONS.unshift(cv);
        }
        cv.messages.push({ from: 'them', text: m.text || '', media: m.media_url || null, mediaType: m.media_type || 'image', time });
        cv.preview = m.media_url ? (m.media_type === 'video' ? '🎥' : '📷') : (m.text || ''); cv.time = 'עכשיו';
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
          // Media-only messages have no text — without the fallback this threw
          // and the notification was silently swallowed by the catch below.
          const preview = m.text ? m.text.slice(0, 60) : (m.media_type === 'video' ? '🎥' : '📷');
          NOTIFICATIONS.unshift({ id: Date.now(), type: 'chat', user: cv.user, text: preview, time: 'עכשיו', unread: true, postId: null });
          updateNotifBadge();
        } catch (e) {}
      })
      .subscribe();

    // ---- R30: live likes + comments from other people ----
    const findByDbId = id => pagiaPosts.concat(stockPosts).find(p => String(p.dbId) === String(id));
    BACKEND.client
      .channel('social-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, payload => {
        const row = payload.new && payload.new.post_id ? payload.new : payload.old;
        if (!row) return;
        const p = findByDbId(row.post_id); if (!p) return;
        if (row.user_id === ME.uid) return;           // our own action, already painted
        p.likes = Math.max(0, (Number(p.likes) || 0) + (payload.eventType === 'DELETE' ? -1 : 1));
        if (typeof paintLike === 'function') paintLike(p);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, payload => {
        const row = payload.new; if (!row) return;
        const p = findByDbId(row.post_id); if (!p) return;
        if (row.user_id === ME.uid) return;
        p.comments.push(commentRow(row));
        if (p.showComments && typeof refreshCommentUI === 'function') refreshCommentUI(p, p.feedType);
        else {
          const btn = document.querySelector(`#post-${p.id} .card-footer .action-btn:nth-child(2)`);
          if (btn) btn.textContent = `💬 ${p.comments.length}`;
        }
      })
      .subscribe();

    // ---- REAL ONLINE PRESENCE ----
    // R37: every open tab held a live subscription to every insert in the
    // table and a slot in one global presence channel — including the tabs
    // sitting in the background all day, which is most of them. Realtime work
    // now stops while the tab is hidden and picks up again on return.
    document.addEventListener('visibilitychange', () => {
      const hidden = document.visibilityState === 'hidden';
      try {
        if (hidden) {
          if (BACKEND.feedChannel) { BACKEND.client.removeChannel(BACKEND.feedChannel); BACKEND.feedChannel = null; }
          if (BACKEND.presence) { BACKEND.client.removeChannel(BACKEND.presence); BACKEND.presence = null; }
          BACKEND.paused = true;
        } else if (BACKEND.paused) {
          BACKEND.paused = false;
          // catch up on whatever arrived while we were away, in one query
          backendRefreshLatest();
        }
      } catch (e) { console.warn('[backend] visibility handling:', e.message || e); }
    });

    const presence = BACKEND.presence = BACKEND.client.channel('presence-online', { config: { presence: { key: CLIENT_ID } } });
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
    showDemoBanner(e.message || String(e));
  }
}

// =====================================================================
// R30 — LIKES & COMMENTS (real, shared, persisted)
// Both used to live only in memory: a refresh wiped them and nobody else
// ever saw them. Needs the R30 block in supabase-schema.sql.
// =====================================================================

// Pull likes + comments for the posts currently loaded, and merge them in.
// R37: counts come from the post row itself (maintained by a DB trigger), not
// from downloading every like. Fetching all like rows to produce a number meant
// a post with 50,000 likes shipped 50,000 rows to the browser.
// The only per-user query left is "which of these did I like", which is bounded
// by the page size, and comments are fetched lazily when a thread is opened.
async function backendHydrateSocial(posts) {
  const real = posts.filter(p => p.dbId);
  if (!BACKEND.ready || !real.length) return;
  const ids = real.map(p => p.dbId);
  const byId = new Map(real.map(p => [String(p.dbId), p]));
  try {
    real.forEach(p => { p.liked = false; });
    if (!ME.uid) return;                       // logged out → nothing else to know
    const mine = await BACKEND.client.from('post_likes').select('post_id').in('post_id', ids).eq('user_id', ME.uid);
    if (mine.error) { console.warn('[backend] likes unavailable (run the R30 schema block):', mine.error.message); return; }
    mine.data.forEach(row => { const p = byId.get(String(row.post_id)); if (p) p.liked = true; });
  } catch (e) { console.warn('[backend] social hydrate failed:', e.message || e); }
}

// R41: the feed carries a 200-character summary. Opening a listing tops it up
// with the full text — one small query for the one listing you're looking at,
// instead of every description for every card you scrolled past.
window.backendLoadFullPost = async function (post) {
  if (!BACKEND.ready || !post.dbId || post._fullDesc) return;
  try {
    const { data, error } = await BACKEND.client.from('posts').select('description').eq('id', post.dbId).single();
    if (error || !data) return;
    post.desc = data.description || post.desc;
    post._fullDesc = true;
    const el = document.querySelector('#detail-content .detail-desc');
    if (el) el.textContent = post.desc;
  } catch (e) {}
};

// Comments load when a thread is actually opened — a feed of 30 posts should
// not download every comment on every one of them up front.
window.backendLoadComments = async function (post) {
  if (!BACKEND.ready || !post.dbId || post._commentsLoaded) return;
  try {
    const r = await BACKEND.client.from('post_comments').select('*').eq('post_id', post.dbId).order('created_at', { ascending: true }).limit(100);
    if (r.error) { console.warn('[backend] comments load failed:', r.error.message); return; }
    post.comments = r.data.map(commentRow);
    post._commentsLoaded = true;
  } catch (e) { console.warn('[backend] comments load error:', e.message || e); }
};

function commentRow(row) {
  return {
    dbId: row.id,
    user: {
      id: row.user_id ? 'db-' + row.user_id : 'db-anon',
      name: row.author_name || 'משתמש',
      avatar: row.author_avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(row.author_name || 'u')),
    },
    text: row.text || '',
    time: new Date(row.created_at).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
}

// A like is one row keyed (post, user) — the composite primary key is what
// makes double-liking impossible even across devices.
window.backendToggleLike = function (post, nowLiked) {
  if (!BACKEND.ready || !post.dbId) return Promise.resolve(true);
  if (!ME.uid) { requireLogin('login_to_like'); return Promise.resolve(false); }
  const q = nowLiked
    ? BACKEND.client.from('post_likes').insert({ post_id: post.dbId, user_id: ME.uid })
    : BACKEND.client.from('post_likes').delete().eq('post_id', post.dbId).eq('user_id', ME.uid);
  return q.then(({ error }) => {
    if (error) { console.warn('[backend] like failed:', error.message); showToast('⚠️ ' + friendlyError(error)); return false; }
    return true;
  });
};

window.backendAddComment = function (post, text) {
  if (!BACKEND.ready || !post.dbId) return Promise.resolve(null);
  if (!ME.uid) { requireLogin('login_to_comment'); return Promise.resolve(null); }
  return BACKEND.client.from('post_comments')
    .insert({ post_id: post.dbId, user_id: ME.uid, author_name: ME.name, author_avatar: ME.avatar, text })
    .select('*').single()
    .then(({ data, error }) => {
      if (error) { console.warn('[backend] comment failed:', error.message); return null; }
      return commentRow(data);
    });
};

// One cheap query on return, instead of a live subscription held open the
// whole time the tab was in the background.
async function backendRefreshLatest() {
  if (!BACKEND.ready) return;
  try {
    const { data, error } = await BACKEND.client
      .from('posts').select(FEED_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(BACKEND.pageSize);
    if (error || !data) return;
    const known = new Set([...pagiaPosts, ...stockPosts].filter(p => p.dbId).map(p => String(p.dbId)));
    const fresh = data.filter(r => !known.has(String(r.id))).map(rowToPost)
      .filter(p => (typeof notifAllowsLocation === 'function') ? notifAllowsLocation(p.location) : true);
    if (!fresh.length) return;
    fresh.reverse().forEach(p => {
      (p.feedType === 'stock' ? stockPosts : pagiaPosts).unshift(p);
      BACKEND.realCount[p.feedType === 'stock' ? 'stock' : 'pagia']++;
      BACKEND.loaded++;
    });
    renderFeed(); renderExpirySoon(); renderDealsWidget();
    console.log(`[backend] caught up — ${fresh.length} new`);
  } catch (e) { console.warn('[backend] catch-up failed:', e.message || e); }
}
window.backendRefreshLatest = backendRefreshLatest;

// =====================================================================
// R39 — reporting, blocking, rate limits
// All three are enforced in the database. What lives here is the wiring
// and the wording; a check that only exists in the browser is a polite
// suggestion, not a protection.
// =====================================================================

// The server raises a specific error when someone posts too fast. Turn it
// into something a person can act on instead of a raw Postgres message.
function friendlyError(error) {
  const m = String((error && error.message) || '');
  if (/rate_limit_exceeded/.test(m)) return t('err_rate_limit');
  if (/row-level security/i.test(m)) return t('err_not_allowed');
  if (/duplicate key|already exists/i.test(m)) return t('err_already_done');
  return m || t('err_generic');
}
window.friendlyError = friendlyError;

window.backendReportPost = async function (post, reason, detail) {
  if (!BACKEND.ready || !post.dbId) return { ok: false, msg: t('err_generic') };
  if (!ME.uid) { requireLogin('login_to_report'); return { ok: false }; }
  const { error } = await BACKEND.client.from('post_reports')
    .insert({ post_id: post.dbId, reporter_id: ME.uid, reason, detail: detail || null });
  if (error) return { ok: false, msg: friendlyError(error) };
  return { ok: true };
};

// Blocking hides their listings and comments and stops messages in both
// directions — the database policies do the enforcing, this keeps the
// screen in step without waiting for a reload.
window.backendBlockUser = async function (uid) {
  if (!BACKEND.ready || !uid) return { ok: false };
  if (!ME.uid) { requireLogin('login_to_block'); return { ok: false }; }
  const clean = String(uid).replace(/^db-/, '');
  const { error } = await BACKEND.client.from('user_blocks').insert({ blocker_id: ME.uid, blocked_id: clean });
  if (error) return { ok: false, msg: friendlyError(error) };
  BLOCKED.add(clean);
  dropBlockedFromMemory(clean);
  return { ok: true };
};

window.backendUnblockUser = async function (uid) {
  if (!BACKEND.ready || !ME.uid) return { ok: false };
  const clean = String(uid).replace(/^db-/, '');
  const { error } = await BACKEND.client.from('user_blocks').delete().eq('blocker_id', ME.uid).eq('blocked_id', clean);
  if (error) return { ok: false, msg: friendlyError(error) };
  BLOCKED.delete(clean);
  return { ok: true };
};

const BLOCKED = new Set();
window.BLOCKED = BLOCKED;
window.isBlocked = function (uid) { return BLOCKED.has(String(uid || '').replace(/^db-/, '')); };

async function loadBlocks() {
  if (!BACKEND.ready || !ME.uid) return;
  try {
    const { data, error } = await BACKEND.client.from('user_blocks').select('blocked_id').eq('blocker_id', ME.uid);
    if (error || !data) return;
    BLOCKED.clear();
    data.forEach(r => BLOCKED.add(r.blocked_id));
    dropBlockedFromMemory();
  } catch (e) {}
}
window.loadBlocks = loadBlocks;

// Remove anything already on screen that belongs to a blocked person.
function dropBlockedFromMemory(justBlocked) {
  // R40: keyed on the account id. It used to compare against user.id, which is
  // "db-<client_id>" — a per-browser string, never a uuid — so the block list
  // matched nothing and no listing was ever actually hidden.
  const gone = post => {
    const uid = post && post.ownerUid;
    return !!uid && (BLOCKED.has(uid) || uid === justBlocked);
  };
  [pagiaPosts, stockPosts].forEach(arr => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i].dbId && gone(arr[i])) arr.splice(i, 1);
  });
  for (let i = CONVERSATIONS.length - 1; i >= 0; i--) { const su = CONVERSATIONS[i].sellerUid; if (su && (BLOCKED.has(su) || su === justBlocked)) CONVERSATIONS.splice(i, 1); }
  try { renderFeed(); renderChatList(); } catch (e) {}
}

// R37: search the database, not the page you happen to have loaded.
// Client-side filtering only ever looked at the ~30 posts in memory, so with a
// large catalogue a search for something real returned nothing. Backed by the
// trigram indexes in the R37 schema block, so it stays fast as rows pile up.
let _searchSeq = 0;
window.backendSearch = async function (query) {
  if (!BACKEND.ready) return null;
  const q = String(query || '').trim();
  if (q.length < 2) return null;
  const seq = ++_searchSeq;
  const pattern = '%' + q.replace(/[%_,]/g, ' ') + '%';
  try {
    const { data, error } = await BACKEND.client
      .from('posts').select(FEED_COLUMNS)
      .or(`product.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern},user_name.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (seq !== _searchSeq) return null;        // a newer keystroke already won
    if (error) { console.warn('[backend] search failed:', error.message); return null; }
    return data.map(rowToPost);
  } catch (e) { console.warn('[backend] search error:', e.message || e); return null; }
};

// ---- Feed pagination: the next page of REAL posts ----
// New posts are spliced in right after the real ones already on screen, so the
// bundled demo content stays at the bottom instead of getting interleaved.
window.backendLoadMore = async function () {
  if (!BACKEND.ready || BACKEND.exhausted || BACKEND.loadingMore) return;
  BACKEND.loadingMore = true;
  try {
    const from = BACKEND.loaded, to = from + BACKEND.pageSize - 1;
    const { data, error } = await BACKEND.client
      .from('posts').select(FEED_COLUMNS)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) { console.warn('[backend] page load failed:', error.message); return; }
    if (!data.length) { BACKEND.exhausted = true; return; }
    BACKEND.loaded += data.length;
    if (data.length < BACKEND.pageSize) BACKEND.exhausted = true;

    const pag = data.filter(r => r.feed_type === 'pagia').map(rowToPost);
    const stk = data.filter(r => r.feed_type === 'stock').map(rowToPost);
    pagiaPosts.splice(BACKEND.realCount.pagia, 0, ...pag);
    stockPosts.splice(BACKEND.realCount.stock, 0, ...stk);
    BACKEND.realCount.pagia += pag.length;
    BACKEND.realCount.stock += stk.length;
    renderFeed();
    backendHydrateSocial(pag.concat(stk)).then(() => renderFeed());
    console.log(`[backend] +${data.length} posts (total ${BACKEND.loaded})${BACKEND.exhausted ? ' — end of feed' : ''}`);
  } finally {
    BACKEND.loadingMore = false;
  }
};

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
      const last = data[data.length - 1];
      cv.preview = last.text || (last.media_url ? (last.media_type === 'video' ? '🎥' : '📷') : '');
    }
    if (activeConvoId === cv.id) {
      const el = document.getElementById('cm-' + cv.id);
      if (el) { el.innerHTML = buildMessages(cv); scrollToBottom('cm-' + cv.id); }
    }
    renderChatList();
  } catch (e) { console.error('[backend] chat load error:', e.message || e); }
}

// Who am I, for the purpose of addressing a chat room? The account id when
// logged in (stable across your devices), the browser id otherwise.
function chatIdentity() {
  return (typeof ME !== 'undefined' && ME.uid) ? ME.uid : CLIENT_ID;
}

// Chat from a REAL (DB) post → bind the conversation to a DB room.
// R29: the room used to be the post id alone, so EVERY buyer interested in the
// same product shared one room and read each other's private messages. The room
// is now post + buyer, which makes each thread a real 1:1 conversation; the
// seller simply receives one room per interested buyer.
const _origOpenChatFromPost = openChatFromPost;
openChatFromPost = function (id, ft) {
  _origOpenChatFromPost(id, ft);
  if (!BACKEND.ready) return;
  const post = getPost(id, ft);
  if (!post || !post.dbId) return; // demo post → local simulated chat
  const cv = CONVERSATIONS.find(c => c.user.id === post.user.id && (!c.post || c.post.id === post.id));
  if (cv && !cv.room) {
    cv.room = post.dbId + ':' + chatIdentity();
    cv.buyerKey = chatIdentity();
    cv.sellerUid = post.ownerUid || null;   // R30: needed by the participants policy
    backendLoadChat(cv);
  }
};

// Every insert must carry both participants, otherwise the R30 policy rejects
// it. Derived from the room for the buyer, and from the message for the seller.
function chatParticipants(cv) {
  const buyerKey = cv.buyerKey || String(cv.room || '').split(':')[1] || null;
  return { buyer_key: buyerKey, seller_uid: cv.sellerUid || null };
}

// Sending: DB rooms → insert to DB (no fake auto-reply); demo → original behavior
const _origSendChat = sendChatMessage;
sendChatMessage = function (id) {
  const cv = CONVERSATIONS.find(c => c.id === id);
  if (!BACKEND.ready || !cv || !cv.room) { _origSendChat(id); return; }
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) { requireLogin('login_to_chat'); return; }
  const inp = document.querySelector('#chat-window .chat-input-field');
  if (!inp || !inp.value.trim()) return;
  const text = inp.value.trim();
  cv.messages.push({ from: 'me', text, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), status: 'sent' });
  cv.preview = text; inp.value = ''; inp.style.height = 'auto';
  const msgs = document.getElementById('cm-' + id);
  if (msgs) { msgs.innerHTML = buildMessages(cv); scrollToBottom('cm-' + id); }
  renderChatList();
  BACKEND.client.from('chat_messages')
    .insert(Object.assign({ room: cv.room, client_id: CLIENT_ID, user_id: (ME.uid || null), sender_name: ME.name, sender_avatar: ME.avatar, text }, chatParticipants(cv)))
    .then(({ error }) => { if (error) { console.error('[backend] chat send failed:', error.message); showToast('⚠️ ' + friendlyError(error)); const i = cv.messages.length - 1; if (i >= 0 && cv.messages[i].from === 'me') { cv.messages.splice(i, 1); const el = document.getElementById('cm-' + id); if (el) el.innerHTML = buildMessages(cv); } } });
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
        .insert(Object.assign({ room: cv.room, client_id: CLIENT_ID, user_id: (ME.uid || null), sender_name: ME.name, sender_avatar: ME.avatar, text: '', media_url: url, media_type: type }, chatParticipants(cv)));
      if (error) { console.error('[backend] chat media failed:', error.message); showToast('⚠️ ' + friendlyError(error)); }
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

// R29: persist "taken/sold". Owner-only by RLS. Needs the `taken` column —
// run the R29 block in supabase-schema.sql once. Without it the update errors
// and the state stays local to this browser.
window.backendMarkTaken = function (p) {
  if (!BACKEND.ready || !p.dbId) return;
  BACKEND.client.from('posts').update({ taken: true }).eq('id', p.dbId).then(({ error }) => {
    if (error) console.warn('[backend] markTaken failed (did you run the R29 schema block?):', error.message);
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
