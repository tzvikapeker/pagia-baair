'use strict';
// =====================================================================
// feed-extras.js — R13: infinite feed + mock post generator
// Loads AFTER app.js. Uses globals: USERS, IMG, addDays, nextPostId,
// pagiaPosts, stockPosts, currentFeedType, buildPagiaCard, buildStockCard.
// =====================================================================

const MOCK_PAGIA = [
  { product:'סלט פירות טרי', category:'פירות', emoji:'🍓', tags:['טרי','בריא'] },
  { product:'מאפים מהבוקר', category:'לחם', emoji:'🥐', tags:['לחם','ביתי'] },
  { product:'ביצים אורגניות', category:'מזון', emoji:'🥚', tags:['טרי','ביתי'] },
  { product:'חלב טרי 3%', category:'חלב', emoji:'🥛', tags:['חלב','כשר'] },
  { product:'עוגת שוקולד', category:'לחם', emoji:'🍰', tags:['ביתי','מתוק'] },
  { product:'ירקות אורגניים', category:'ירקות', emoji:'🥬', tags:['ירקות','טרי'] },
  { product:'פיתות טריות', category:'לחם', emoji:'🫓', tags:['לחם','טרי'] },
  { product:'גבינה בולגרית', category:'חלב', emoji:'🧀', tags:['חלב','כשר'] },
  { product:'תותים מתוקים', category:'פירות', emoji:'🍓', tags:['פירות','טרי'] },
  { product:'סושי ביתי', category:'מזון', emoji:'🍣', tags:['טרי','ביתי'] },
  { product:'מרק עדשים', category:'מזון', emoji:'🍲', tags:['ביתי','טבעוני'] },
  { product:'קרואסונים', category:'לחם', emoji:'🥐', tags:['לחם','ביתי'] },
];

const MOCK_STOCK = [
  { product:'עודף חטיפים – ארגז', category:'מזון', emoji:'🍫', tags:['סטוק','מזון'] },
  { product:'מארז שימורים', category:'מזון', emoji:'🥫', tags:['סטוק','אחסנה ארוכה'] },
  { product:'סבוני כלים – סיטונאי', category:'ניקיון', emoji:'🧴', tags:['סטוק','ניקיון'] },
  { product:'מגבות נייר – מארז', category:'ניקיון', emoji:'🧻', tags:['סטוק','ניקיון'] },
  { product:'קרם פנים – עודף', category:'קוסמטיקה', emoji:'💧', tags:['סטוק','קוסמטיקה'] },
  { product:'משקאות אנרגיה', category:'שתייה', emoji:'🥤', tags:['סטוק','שתייה'] },
  { product:'קפה טחון – מארז', category:'שתייה', emoji:'☕', tags:['סטוק','אחסנה ארוכה'] },
  { product:'שמן זית – פחים', category:'מזון', emoji:'🫒', tags:['סטוק','מזון'] },
  { product:'בשמים – עודף מלאי', category:'קוסמטיקה', emoji:'🌸', tags:['סטוק','קוסמטיקה'] },
  { product:'ממתקים – סיטונאי', category:'מזון', emoji:'🍬', tags:['סטוק','מזון'] },
];

const MOCK_CITIES = ['תל אביב','ירושלים','חיפה','נתניה','ראשון לציון','באר שבע','רחובות','אשדוד','פתח תקווה','הרצליה'];
const MOCK_TIMES  = ['הרגע','לפני דקה','לפני 5 דקות','לפני 20 דקות','לפני שעה','לפני שעתיים','לפני 3 שעות'];
const MOCK_IMGS_PAGIA = [IMG.hummus, IMG.bread, IMG.vegetables, IMG.yogurt, IMG.cheese, null, null];
const MOCK_IMGS_STOCK = [IMG.cleaning, IMG.pasta, IMG.cosmetics, IMG.drinks, null, null];

function _pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function _int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateMockPost(feedType) {
  const user = _pick(USERS);
  const city = _pick(MOCK_CITIES);
  if (feedType === 'stock') {
    const t = _pick(MOCK_STOCK);
    const op = _int(80, 600);
    const sp = Math.max(5, Math.round(op * _int(30, 70) / 100));
    return {
      id: nextPostId++, feedType: 'stock', user, product: t.product, category: t.category,
      emoji: t.emoji, image: _pick(MOCK_IMGS_STOCK), desc: t.product,
      originalPrice: op, salePrice: sp, quantity: _int(5, 200), location: city,
      free: false, tags: t.tags.slice(), likes: _int(0, 45), liked: false, saved: false,
      discountPct: Math.round((1 - sp / op) * 100), time: _pick(MOCK_TIMES),
      comments: [], showComments: false,
    };
  }
  const t = _pick(MOCK_PAGIA);
  const free = Math.random() < 0.4;
  return {
    id: nextPostId++, feedType: 'pagia', user, product: t.product, category: t.category,
    emoji: t.emoji, image: _pick(MOCK_IMGS_PAGIA), desc: t.product,
    expiry: addDays(_int(0, 6)), location: city, price: free ? 0 : _int(5, 40), free,
    tags: t.tags.slice(), likes: _int(0, 30), liked: false, saved: false,
    time: _pick(MOCK_TIMES), comments: [], showComments: false,
  };
}

let _feedLoading = false;

// Only auto-load on the feed page when the feed is NOT being searched/filtered.
function _feedIsPlain() {
  const feedPage = document.getElementById('page-feed');
  if (!feedPage || !feedPage.classList.contains('active')) return false;
  const search = document.getElementById('search-input');
  if (search && search.value.trim()) return false;
  const controls = currentFeedType === 'pagia' ? 'pagia-controls' : 'stock-controls';
  const active = document.querySelector('#' + controls + ' .filter-tab.active');
  // first filter tab is "all"; if a later one is active, skip infinite load
  if (active && active.previousElementSibling) return false;
  return true;
}

// R29: when the app is connected to the DB, scrolling loads the NEXT PAGE OF
// REAL POSTS. It used to fabricate mock products forever and splice them in
// among genuine listings — on a live feed that reads as an app full of fake
// items. Mock generation now only happens in offline/demo mode.
function loadMoreFeed() {
  if (_feedLoading || !_feedIsPlain()) return;
  const grid = document.getElementById('feed-grid');
  if (!grid) return;

  if (typeof backendLoadMore === 'function' && window.BACKEND && BACKEND.ready) {
    _feedLoading = true;
    Promise.resolve(backendLoadMore(currentFeedType))
      .catch(e => console.warn('[feed] load more failed:', e && e.message))
      .then(() => { _feedLoading = false; });
    return;
  }

  _feedLoading = true;
  const batch = 4;
  const arr = currentFeedType === 'stock' ? stockPosts : pagiaPosts;
  for (let i = 0; i < batch; i++) {
    const p = generateMockPost(currentFeedType);
    arr.push(p);
    grid.insertAdjacentHTML('beforeend', p.feedType === 'stock' ? buildStockCard(p) : buildPagiaCard(p));
  }
  _feedLoading = false;
}

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 700) loadMoreFeed();
}, { passive: true });

// Also expose for manual trigger / testing.
window.loadMoreFeed = loadMoreFeed;
window.generateMockPost = generateMockPost;
