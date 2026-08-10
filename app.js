'use strict';

// =====================
// IMAGE PATHS
// =====================
// Relative, project-local paths (portable — Rule #6).
// Drop the 9 PNGs into ./images/ using these exact filenames.
// If a file is missing, the UI falls back to the emoji placeholder (see imgFallback).
const IMG = {
  hummus:     'images/hummus.svg',
  bread:      'images/bread.svg',
  vegetables: 'images/vegetables.svg',
  yogurt:     'images/yogurt.svg',
  cheese:     'images/cheese.svg',
  cleaning:   'images/cleaning.svg',
  pasta:      'images/pasta.svg',
  cosmetics:  'images/cosmetics.svg',
  drinks:     'images/drinks.svg',
};

// =====================
// HTML SAFETY (R28)
// =====================
// Every render path below builds HTML strings and assigns them with innerHTML.
// Anything that came from another user (post text, names, chat messages, media
// URLs) MUST go through esc() / safeUrl() first — otherwise a post titled
// `<img src=x onerror=...>` runs in every viewer's browser (stored XSS).
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window.esc = esc;

// For src/href attributes: keeps https/relative/blob and inline media, drops
// javascript:, vbscript:, file: and data: payloads that aren't image/video.
function safeUrl(u) {
  const s = String(u == null ? '' : u).trim();
  if (!s) return '';
  if (/^(javascript|vbscript|file):/i.test(s)) return '';
  if (/^data:/i.test(s) && !/^data:(image|video)\//i.test(s)) return '';
  return esc(s);
}
window.safeUrl = safeUrl;

// Graceful fallback: if an <img> fails to load, swap it for the emoji placeholder.
// The emoji is read from data-emoji so it never has to be inlined into the
// onerror="" JS string (which would be an injection point of its own).
function imgFallback(el, emoji) {
  const d = document.createElement('div');
  d.className = el.classList.contains('detail-image') ? 'detail-image-placeholder' : 'card-image-placeholder';
  d.textContent = emoji || el.getAttribute('data-emoji') || '📦';
  el.replaceWith(d);
}
window.imgFallback = imgFallback;

// Avatars are fetched from an external service (dicebear). When it's blocked,
// rate-limited or the user is offline, every avatar in the app became a broken
// image icon. One capture-phase listener covers every avatar that exists now or
// gets rendered later, and swaps in an initial — without replacing the <img>
// element, which other code (applyIdentity) still looks up and updates.
document.addEventListener('error', e => {
  const el = e.target;
  if (!(el instanceof HTMLImageElement) || el.dataset.avatarFallback) return;
  const isAvatar = /dicebear|avatar/i.test(el.getAttribute('src') || '') ||
    !!el.closest('.card-avatar, .comment-avatar, .chat-convo-avatar, .chat-msg-avatar, .detail-user, .notif-avatar, .nav-avatar, .chat-window-header');
  if (!isAvatar) return;
  el.dataset.avatarFallback = '1';
  const initial = ((el.getAttribute('alt') || '').trim()[0] || '?').toUpperCase();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="32" fill="#2a313a"/>' +
    '<text x="32" y="42" font-size="28" text-anchor="middle" fill="#9aa4b2" font-family="sans-serif">' +
    initial.replace(/[<>&"]/g, '') + '</text></svg>';
  el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}, true);

// Renders product media: <video> for uploaded videos, <img> otherwise, or emoji placeholder.
function mediaTag(post, ft, opts) {
  opts = opts || {};
  const cls = opts.detail ? 'detail-image' : 'card-image';
  const phCls = opts.detail ? 'detail-image-placeholder' : 'card-image-placeholder';
  const src = safeUrl(post.image);
  if (!src) return `<div class="${phCls}">${esc(post.emoji)}</div>`;
  if (post.mediaType === 'video')
    return `<video class="${cls}" src="${src}" controls playsinline preload="metadata"${opts.detail ? '' : ' onclick="event.stopPropagation()"'}></video>`;
  const click = opts.detail ? '' : ` onclick="openDetail(${Number(post.id)},'${ft === 'stock' ? 'stock' : 'pagia'}')"`;
  return `<img class="${cls}" src="${src}" alt="${esc(post.product)}"${click} loading="lazy" data-emoji="${esc(post.emoji)}" onerror="imgFallback(this)"/>`;
}
window.mediaTag = mediaTag;

const USERS = [
  { id:1, name:'\u05D3\u05E0\u05D0 \u05D0\u05D1\u05E8\u05D4\u05DD',       avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Dana&backgroundColor=b6e3f4',   city:'\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1',  isBusiness:false },
  { id:2, name:'\u05DE\u05E9\u05D4 \u05DB\u05D4\u05DF',         avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Moshe&backgroundColor=c0aede',  city:'\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD', isBusiness:false },
  { id:3, name:'\u05D8\u05DC \u05DC\u05D5\u05D9',           avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Tal&backgroundColor=ffd5dc',    city:'\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1',  isBusiness:false },
  { id:4, name:'\u05E0\u05D5\u05E2\u05D4 \u05E9\u05E4\u05D9\u05E8\u05D0',     avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Noa&backgroundColor=d1f4e0',   city:'\u05D7\u05D9\u05E4\u05D4',     isBusiness:false },
  { id:5, name:'\u05D0\u05D5\u05E8\u05D9 \u05D2\u05DC',        avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Uri&backgroundColor=ffdfbf',    city:'\u05E0\u05EA\u05E0\u05D9\u05D4',    isBusiness:false },
  { id:6, name:'\u05E1\u05D5\u05E4\u05E8\u05DE\u05E8\u05E7\u05D8 \u05DB\u05D4\u05DF',  avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=BizCo&backgroundColor=ffeaa7',  city:'\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1',  isBusiness:true, bizName:'\u05E1\u05D5\u05E4\u05E8\u05DE\u05E8\u05E7\u05D8 \u05DB\u05D4\u05DF' },
  { id:7, name:'\u05DE\u05D0\u05E4\u05D9\u05D9\u05EA \u05D4\u05D1\u05D5\u05E7\u05E8',  avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Bakery&backgroundColor=fdcb6e', city:'\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD', isBusiness:true, bizName:'\u05DE\u05D0\u05E4\u05D9\u05D9\u05EA \u05D4\u05D1\u05D5\u05E7\u05E8' },
  { id:8, name:'\u05D9\u05D5\u05E4\u05D9 \u05D5\u05D9\u05D5\u05E4\u05D9', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Beauty&backgroundColor=e17055', city:'\u05D7\u05D9\u05E4\u05D4',     isBusiness:true, bizName:'\u05D9\u05D5\u05E4\u05D9 \u05D5\u05D9\u05D5\u05E4\u05D9' },
  { id:9, name:'\u05D3\u05E8\u05D9\u05E0\u05E7\u05E1 \u05E4\u05DC\u05D5\u05E1', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Drinks&backgroundColor=74b9ff', city:'\u05E8\u05D7\u05D5\u05D1\u05D5\u05EA',   isBusiness:true, bizName:'\u05D3\u05E8\u05D9\u05E0\u05E7\u05E1 \u05E4\u05DC\u05D5\u05E1' },
];
const ME = USERS[0];

const today = new Date();
const addDays = n => { const d=new Date(today); d.setDate(d.getDate()+n); return d; };

let pagiaPosts = [
  { id:1, feedType:'pagia', user:USERS[1], product:'\u05D7\u05D5\u05DE\u05D5\u05E1 \u05D1\u05D9\u05EA\u05D9', category:'\u05DE\u05D6\u05D5\u05DF', emoji:'\uD83E\uDED9', image:IMG.hummus, desc:'\u05D4\u05DB\u05E0\u05EA\u05D9 \u05D7\u05D5\u05DE\u05D5\u05E1 \u05D1\u05D9\u05EA\u05D9 \u05DE\u05E2\u05D5\u05DC\u05D4, \u05D9\u05E6\u05D0 \u05D4\u05E8\u05D1\u05D4 \u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9! \u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05D8\u05D1\u05E2\u05D5\u05E0\u05D9\u05DD, \u05DE\u05DE\u05E9 \u05D8\u05E8\u05D9. \u05DB\u05DE\u05D5\u05EA: \u05D7\u05E6\u05D9 \u05E7\u05D2.', expiry:addDays(1), location:'\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD, \u05E8\u05D7\u05D1\u05D9\u05D4', price:0, free:true, tags:['\u05D7\u05D9\u05E0\u05DD','\u05D8\u05D1\u05E2\u05D5\u05E0\u05D9','\u05D1\u05D9\u05EA\u05D9'], likes:14, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 20 \u05D3\u05E7\u05D5\u05EA', comments:[{user:USERS[2],text:'\u05D0\u05E0\u05D9 \u05DE\u05E2\u05D5\u05E0\u05D9\u05D9\u05DF! \u05DE\u05EA\u05D9 \u05D0\u05E4\u05E9\u05E8?',time:'\u05DC\u05E4\u05E0\u05D9 10 \u05D3\u05E7\u05D5\u05EA'},{user:USERS[3],text:'\u05E0\u05E9\u05DE\u05E2 \u05DE\u05D3\u05D4\u05D9\u05DD!',time:'\u05DC\u05E4\u05E0\u05D9 5 \u05D3\u05E7\u05D5\u05EA'}], showComments:false },
  { id:2, feedType:'pagia', user:USERS[2], product:'\u05E9\u05E7\u05D9\u05EA \u05D9\u05E8\u05E7\u05D5\u05EA', category:'\u05D9\u05E8\u05E7\u05D5\u05EA', emoji:'\uD83E\uDD66', image:IMG.vegetables, desc:'\u05E2\u05D2\u05D1\u05E0\u05D9\u05D5\u05EA, \u05E4\u05DC\u05E4\u05DC\u05D9\u05DD, \u05E7\u05D9\u05E9\u05D5\u05D0\u05D9\u05DD \u2013 \u05D4\u05DB\u05DC \u05D8\u05E8\u05D9 \u05DE\u05DE\u05E9.', expiry:addDays(2), location:'\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1, \u05E4\u05DC\u05D5\u05E8\u05E0\u05D8\u05D9\u05DF', price:15, free:false, tags:['\u05D9\u05E8\u05E7\u05D5\u05EA','\u05D8\u05E8\u05D9'], likes:8, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4', comments:[{user:USERS[0],text:'\u05E0\u05D9\u05D2\u05E9 \u05D0\u05D7\u05E8\u05D9 18:00',time:'\u05DC\u05E4\u05E0\u05D9 40 \u05D3\u05E7\u05D5\u05EA'}], showComments:false },
  { id:3, feedType:'pagia', user:USERS[3], product:'\u05DC\u05D7\u05DD \u05E9\u05D0\u05D5\u05E8 \u05D1\u05D9\u05EA\u05D9', category:'\u05DC\u05D7\u05DD', emoji:'\uD83C\uDF5E', image:IMG.bread, desc:'\u05D0\u05E4\u05D9\u05EA\u05D9 \u05DC\u05D7\u05DD \u05E9\u05D0\u05D5\u05E8 \u05D0\u05DE\u05E9, \u05DB\u05D9\u05DB\u05E8 \u05E9\u05DC\u05DE\u05D4. \u05E2\u05D3\u05D9\u05D9\u05DF \u05D8\u05E8\u05D9!', expiry:addDays(0), location:'\u05D7\u05D9\u05E4\u05D4, \u05D4\u05DB\u05E8\u05DE\u05DC', price:0, free:true, tags:['\u05D7\u05D9\u05E0\u05DD','\u05DC\u05D7\u05DD','\u05D1\u05D9\u05EA\u05D9'], likes:22, liked:true, saved:true, time:'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05EA\u05D9\u05D9\u05DD', comments:[{user:USERS[1],text:'\u05E9\u05DE\u05E8\u05EA\u05D9! \u05D0\u05E0\u05D9 \u05D1\u05D0 \u05DE\u05D7\u05E8 \u05D1\u05D1\u05D5\u05E7\u05E8',time:'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4'},{user:USERS[4],text:'\u05D0\u05E9\u05DE\u05D7 \u05DC\u05E7\u05D7\u05EA \u05D0\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF \u05D6\u05DE\u05D9\u05DF',time:'\u05DC\u05E4\u05E0\u05D9 30 \u05D3\u05E7\u05D5\u05EA'}], showComments:false },
  { id:4, feedType:'pagia', user:USERS[4], product:'\u05D9\u05D5\u05D2\u05D5\u05E8\u05D8 \u05D9\u05D5\u05D5\u05E0\u05D9', category:'\u05D7\u05DC\u05D1', emoji:'\uD83E\uDD5B', image:IMG.yogurt, desc:'3 \u05D2\u05D1\u05D9\u05E2\u05D9\u05DD \u05D9\u05D5\u05D2\u05D5\u05E8\u05D8 5% \u05E9\u05D5\u05DE\u05DF. \u05E4\u05D2 \u05EA\u05D5\u05E7\u05E3 \u05D1\u05E2\u05D5\u05D3 3 \u05D9\u05DE\u05D9\u05DD.', expiry:addDays(3), location:'\u05E0\u05EA\u05E0\u05D9\u05D4, \u05E2\u05D9\u05E8 \u05D9\u05DE\u05D9\u05DD', price:10, free:false, tags:['\u05D7\u05DC\u05D1','\u05DB\u05E9\u05E8'], likes:6, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 3 \u05E9\u05E2\u05D5\u05EA', comments:[], showComments:false },
  { id:5, feedType:'pagia', user:USERS[1], product:'\u05DE\u05D2\u05D5\u05D5\u05DF \u05D2\u05D1\u05D9\u05E0\u05D5\u05EA', category:'\u05D7\u05DC\u05D1', emoji:'\uD83E\uDDC0', image:IMG.cheese, desc:'\u05E6\u05D4\u05D5\u05D1\u05D4, \u05D1\u05D5\u05DC\u05D2\u05E8\u05D9\u05EA, \u05E7\u05D5\u05D8\u05D2. \u05DB\u05D5\u05DC\u05DF \u05E1\u05D2\u05D5\u05E8\u05D5\u05EA.', expiry:addDays(5), location:'\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD', price:20, free:false, tags:['\u05D7\u05DC\u05D1','\u05DB\u05E9\u05E8'], likes:3, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 5 \u05E9\u05E2\u05D5\u05EA', comments:[], showComments:false },
];

let stockPosts = [
  { id:101, feedType:'stock', user:USERS[5], product:'\u05DE\u05D5\u05E6\u05E8\u05D9 \u05E0\u05D9\u05E7\u05D9\u05D5\u05DF \u2013 \u05E1\u05D8\u05D5\u05E7 \u05E2\u05D5\u05D3\u05E3', category:'\u05E0\u05D9\u05E7\u05D9\u05D5\u05DF', emoji:'\uD83E\uDDF9', image:IMG.cleaning, desc:'\uD83C\uDFE2 \u05E1\u05D5\u05E4\u05E8\u05DE\u05E8\u05E7\u05D8 \u05DB\u05D4\u05DF | \u05DE\u05D2\u05D5\u05D5\u05DF \u05D2\u05D3\u05D5\u05DC \u05E9\u05DC \u05DE\u05D5\u05E6\u05E8\u05D9 \u05E0\u05D9\u05E7\u05D9\u05D5\u05DF. 200 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA! \u05DB\u05D5\u05DC\u05DC \u05E1\u05D1\u05D5\u05E0\u05D9 \u05DB\u05DC\u05D9\u05DD, \u05E0\u05D5\u05D6\u05DC \u05E8\u05E6\u05E4\u05D4, \u05E1\u05E4\u05D5\u05D2\u05D9\u05DD.', originalPrice:120, salePrice:45, quantity:200, location:'\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1, \u05E9\u05D5\u05E7 \u05D4\u05DB\u05E8\u05DE\u05DC', free:false, tags:['\u05E1\u05D8\u05D5\u05E7','\u05E0\u05D9\u05E7\u05D9\u05D5\u05DF','\u05E2\u05E1\u05E7'], likes:31, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 30 \u05D3\u05E7\u05D5\u05EA', discountPct:63, comments:[{user:USERS[2],text:'\u05D0\u05E4\u05E9\u05E8 \u05DC\u05E7\u05D7\u05EA 20 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA?',time:'\u05DC\u05E4\u05E0\u05D9 15 \u05D3\u05E7\u05D5\u05EA'},{user:USERS[3],text:'\u05DE\u05D7\u05D9\u05E8 \u05DE\u05D3\u05D4\u05D9\u05DD! \u05D1\u05D0 \u05DC\u05E7\u05D7\u05EA \u05DE\u05D7\u05E8',time:'\u05DC\u05E4\u05E0\u05D9 5 \u05D3\u05E7\u05D5\u05EA'}], showComments:false },
  { id:102, feedType:'stock', user:USERS[2], product:'\u05E4\u05E1\u05D8\u05D4 \u05D5\u05D0\u05D5\u05E8\u05D6 \u2013 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05E2\u05D5\u05D3\u05E4\u05D5\u05EA', category:'\u05DE\u05D6\u05D5\u05DF', emoji:'\uD83C\uDF5D', image:IMG.pasta, desc:'\u05E7\u05E0\u05D9\u05EA\u05D9 \u05E1\u05D8\u05D5\u05E7 \u05DC\u05E4\u05E1\u05D7 \u05E9\u05DC\u05D0 \u05D4\u05E9\u05EA\u05DE\u05E9\u05EA\u05D9. 30 \u05D7\u05D1\u05D9\u05DC\u05D5\u05EA \u05E4\u05E1\u05D8\u05D4 + 20 \u05E9\u05E7\u05D9\u05D5\u05EA \u05D0\u05D5\u05E8\u05D6. \u05DE\u05D5\u05DB\u05E8 \u05D1\u05D9\u05D7\u05D3.', originalPrice:0, salePrice:80, quantity:50, location:'\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD, \u05D2\u05D9\u05DC\u05D4', free:false, tags:['\u05DE\u05D6\u05D5\u05DF','\u05D0\u05D7\u05E1\u05E0\u05D4 \u05D0\u05E8\u05D5\u05DB\u05D4','\u05E4\u05E8\u05D8\u05D9'], likes:12, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4', discountPct:0, comments:[{user:USERS[0],text:'\u05DE\u05D4 \u05D4\u05DB\u05DE\u05D5\u05EA \u05D4\u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA?',time:'\u05DC\u05E4\u05E0\u05D9 50 \u05D3\u05E7\u05D5\u05EA'}], showComments:false },
  { id:103, feedType:'stock', user:USERS[7], product:'\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4 \u2013 \u05DE\u05D1\u05E6\u05E2 \u05DE\u05D7\u05E1\u05DF', category:'\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4', emoji:'\uD83D\uDC84', image:IMG.cosmetics, desc:'\uD83C\uDFE2 \u05D9\u05D5\u05E4\u05D9 \u05D5\u05D9\u05D5\u05E4\u05D9 | \u05DE\u05D2\u05D5\u05D5\u05DF \u05E9\u05DE\u05E4\u05D5, \u05E7\u05E8\u05DE\u05D9\u05DD \u05D5\u05E1\u05E8\u05D5\u05DE\u05D9\u05DD \u05E9\u05E0\u05D2\u05DE\u05E8\u05D4 \u05DC\u05D4\u05DD \u05D4\u05D3\u05E9\u05DC\u05E3. \u05DC\u05D0 \u05E7\u05E8\u05D5\u05D1\u05D9\u05DD \u05DC\u05E4\u05E7\u05D9\u05E2\u05D4 \u2013 \u05E4\u05E9\u05D5\u05D8 \u05E2\u05D5\u05D3\u05E3 \u05DE\u05D7\u05E1\u05DF.', originalPrice:250, salePrice:89, quantity:80, location:'\u05D7\u05D9\u05E4\u05D4, \u05DE\u05E8\u05DB\u05D6 \u05D4\u05DB\u05E8\u05DE\u05DC', free:false, tags:['\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4','\u05E1\u05D8\u05D5\u05E7','\u05E2\u05E1\u05E7'], likes:47, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 2 \u05E9\u05E2\u05D5\u05EA', discountPct:64, comments:[{user:USERS[1],text:'\u05D0\u05D9\u05D6\u05D4 \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D1\u05D3\u05D9\u05D9\u05E7 \u05D9\u05E9?',time:'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4'},{user:USERS[4],text:'\u05E8\u05D5\u05E6\u05D4 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA!',time:'\u05DC\u05E4\u05E0\u05D9 30 \u05D3\u05E7\u05D5\u05EA'}], showComments:false },
  { id:104, feedType:'stock', user:USERS[8], product:'\u05DE\u05E9\u05E7\u05D0\u05D5\u05EA \u2013 \u05DE\u05D0\u05E8\u05D6\u05D9 \u05E9\u05EA\u05D9\u05D9\u05D4', category:'\u05E9\u05EA\u05D9\u05D9\u05D4', emoji:'\uD83E\uDD64', image:IMG.drinks, desc:'\uD83C\uDFE2 \u05D3\u05E8\u05D9\u05E0\u05E7\u05E1 \u05E4\u05DC\u05D5\u05E1 | 5 \u05D0\u05E8\u05D2\u05D6\u05D9 \u05DE\u05D9\u05E5 \u05D8\u05D1\u05E2\u05D9 100% + 3 \u05D0\u05E8\u05D2\u05D6\u05D9 \u05DE\u05D9\u05DD \u05DE\u05D5\u05D2\u05D6\u05D9\u05DD. \u05E0\u05E9\u05D0\u05E8\u05D5 \u05D0\u05D7\u05E8\u05D9 \u05D0\u05D9\u05E8\u05D5\u05E2 \u05D7\u05D1\u05E8\u05D4.', originalPrice:800, salePrice:290, quantity:8, location:'\u05E8\u05D7\u05D5\u05D1\u05D5\u05EA, \u05D0\u05D6\u05D5\u05E8 \u05EA\u05E2\u05E9\u05D9\u05D9\u05D4', free:false, tags:['\u05E9\u05EA\u05D9\u05D9\u05D4','\u05E1\u05D8\u05D5\u05E7','\u05D0\u05E8\u05D2\u05D6\u05D9\u05DD','\u05E2\u05E1\u05E7'], likes:19, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 4 \u05E9\u05E2\u05D5\u05EA', discountPct:64, comments:[], showComments:false },
  { id:105, feedType:'stock', user:USERS[3], product:'\u05E6\u05D9\u05D5\u05D3 \u05E1\u05E4\u05D5\u05E8\u05D8 \u2013 \u05D0\u05D7\u05E8\u05D9 \u05DE\u05E2\u05D1\u05E8 \u05D3\u05D9\u05E8\u05D4', category:'\u05D0\u05D7\u05E8', emoji:'\uD83C\uDFCB\uFE0F', image:null, desc:'\u05D0\u05D7\u05E8\u05D9 \u05DE\u05E2\u05D1\u05E8 \u05D3\u05D9\u05E8\u05D4 \u05D0\u05E0\u05D9 \u05DE\u05D5\u05DB\u05E8: \u05DB\u05D3\u05D5\u05E8 \u05DB\u05D5\u05E9\u05E8, 2 \u05D6\u05D5\u05D2\u05D5\u05EA \u05D0\u05DC\u05D8\u05E8, \u05DE\u05D7\u05E6\u05DC\u05EA \u05D9\u05D5\u05D2\u05D4. \u05D4\u05DB\u05DC \u05D1\u05DE\u05E6\u05D1 \u05DE\u05E2\u05D5\u05DC\u05D4!', originalPrice:350, salePrice:120, quantity:1, location:'\u05D7\u05D9\u05E4\u05D4, \u05E0\u05D5\u05D5\u05D4 \u05E9\u05D0\u05E0\u05DF', free:false, tags:['\u05E1\u05E4\u05D5\u05E8\u05D8','\u05E4\u05E8\u05D8\u05D9'], likes:8, liked:false, saved:false, time:'\u05DC\u05E4\u05E0\u05D9 6 \u05E9\u05E2\u05D5\u05EA', discountPct:66, comments:[{user:USERS[1],text:'\u05DE\u05D4 \u05D2\u05D5\u05D3\u05DC \u05DE\u05D7\u05E6\u05DC\u05EA \u05D4\u05D9\u05D5\u05D2\u05D4?',time:'\u05DC\u05E4\u05E0\u05D9 5 \u05E9\u05E2\u05D5\u05EA'}], showComments:false },
];

let nextPostId = 200;
let currentFeedType = 'pagia';
let currentPostType = 'pagia';
let currentSellerType = 'private';
let exploreFeedMode = 'pagia';
let activeConvoId = null;

const CONVERSATIONS = [
  { id:'c1', user:USERS[1], online:true, unread:2, preview:'\u05D0\u05E0\u05D9 \u05D1\u05D0 \u05DE\u05D7\u05E8 \u05D1\u05D9\u05DF 17-19', time:'\u05DC\u05E4\u05E0\u05D9 5 \u05D3\u05E7\u05D5\u05EA', messages:[{from:'them',text:'\u05E9\u05DC\u05D5\u05DD! \u05E8\u05D0\u05D9\u05EA\u05D9 \u05D0\u05EA \u05D4\u05D7\u05D5\u05DE\u05D5\u05E1',time:'10:30'},{from:'me',text:'\u05D4\u05D9\u05D9! \u05DB\u05DF, \u05E2\u05D3\u05D9\u05D9\u05DF \u05D6\u05DE\u05D9\u05DF',time:'10:32'},{from:'them',text:'\u05D0\u05E0\u05D9 \u05D1\u05D0 \u05DE\u05D7\u05E8 \u05D1\u05D9\u05DF 17-19',time:'10:33'}] },
  { id:'c2', user:USERS[7], online:true, unread:0, preview:'\u05DB\u05DF, \u05D0\u05E4\u05E9\u05E8 \u05DC\u05E7\u05D7\u05EA 10 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA', time:'\u05DC\u05E4\u05E0\u05D9 20 \u05D3\u05E7\u05D5\u05EA', messages:[{from:'them',text:'\u05E9\u05DC\u05D5\u05DD, \u05E8\u05D0\u05D9\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4',time:'14:00'},{from:'me',text:'\u05D0\u05D9\u05D6\u05D4 \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D0\u05EA\u05D4 \u05DE\u05D7\u05E4\u05E9?',time:'14:05'},{from:'them',text:'\u05D0\u05E4\u05E9\u05E8 10 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05E9\u05DE\u05E4\u05D5?',time:'14:08'},{from:'me',text:'\u05D1\u05D8\u05D7! \u05D0\u05E4\u05E9\u05E8 \u05DC\u05D1\u05D5\u05D0 \u05DE\u05D7\u05E8',time:'14:10'},{from:'them',text:'\u05DB\u05DF, \u05D0\u05E4\u05E9\u05E8 \u05DC\u05E7\u05D7\u05EA 10 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA',time:'14:12'}] },
  { id:'c3', user:USERS[3], online:false, unread:0, preview:'\u05EA\u05D5\u05D3\u05D4 \u05E8\u05D1\u05D4!', time:'\u05D0\u05EA\u05DE\u05D5\u05DC', messages:[{from:'them',text:'\u05E9\u05DC\u05D7\u05EA\u05D9 \u05DB\u05EA\u05D5\u05D1\u05EA',time:'09:07'},{from:'me',text:'\u05DE\u05E2\u05D5\u05DC\u05D4, \u05EA\u05D2\u05D9\u05E2 \u05D1\u05E9\u05E2\u05D4 11',time:'09:08'},{from:'them',text:'\u05EA\u05D5\u05D3\u05D4 \u05E8\u05D1\u05D4!',time:'11:30'}] },
];

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('splash-screen').remove();
    document.getElementById('app').classList.remove('hidden');
  }, 2800);
  const di = document.getElementById('new-product-expiry');
  if (di) { di.min = today.toISOString().split('T')[0]; di.value = addDays(1).toISOString().split('T')[0]; }
  renderFeed();
  renderChatList();
  renderProfileGrid('pagia');
  renderExpirySoon();
  renderDealsWidget();
  const si = document.getElementById('search-input');
  if (si) {
    let deb;
    si.addEventListener('input', e => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) { renderFeed(); return; }
        showPage('feed');
        renderFeed(q);                       // instant answer from what's loaded
        // R37: then ask the database, which knows about everything else.
        if (window.BACKEND && BACKEND.ready && typeof backendSearch === 'function') {
          backendSearch(q).then(hits => {
            if (!hits || e.target.value.trim().toLowerCase() !== q) return;
            renderSearchResults(hits, q);
          });
        }
      }, 300);
    });
  }
  document.addEventListener('click', e => {
    const panel = document.getElementById('notifications-panel');
    const btn   = document.getElementById('notif-btn');
    if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && btn && !btn.contains(e.target)) panel.classList.add('hidden');
  });
});

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const btn  = document.getElementById('btn-' + name);
  if (page) page.classList.add('active');
  if (btn)  btn.classList.add('active');
  if (name === 'chat')    renderChatList();
  if (name === 'saved')   renderSaved('all');
  if (name === 'profile') { renderProfileGrid('pagia'); updateProfileStats(); }
  if (name === 'explore') renderCategoryCounts();
  setActiveBottomNav('bn-' + name);
}

function switchFeed(type, btn) {
  currentFeedType = type;
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('pagia-controls').classList.toggle('hidden', type !== 'pagia');
  document.getElementById('stock-controls').classList.toggle('hidden', type !== 'stock');
  const pf = document.querySelector('#pagia-controls .filter-tab');
  const sf = document.querySelector('#stock-controls .filter-tab');
  document.querySelectorAll('#pagia-controls .filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#stock-controls .filter-tab').forEach(t => t.classList.remove('active'));
  if (pf) pf.classList.add('active');
  if (sf) sf.classList.add('active');
  renderFeed();
}

function renderFeed(searchQuery, filterFn) {
  const grid = document.getElementById('feed-grid');
  grid.innerHTML = '';
  let posts = liveFiltered(currentFeedType === 'pagia' ? pagiaPosts : stockPosts);
  if (searchQuery) {
    // The query arrives lower-cased, so every field has to be lower-cased too —
    // previously only `desc` was, which meant any capitalised product name,
    // city or seller was unsearchable.
    const q = String(searchQuery).toLowerCase();
    const has = v => String(v == null ? '' : v).toLowerCase().includes(q);
    posts = [...liveFiltered(pagiaPosts), ...liveFiltered(stockPosts)].filter(p =>
      has(p.product) || has(p.desc) || has(p.location) || has(p.category) ||
      (p.tags || []).some(has) || has(p.user.name) || has(p.user.bizName)
    );
  } else if (filterFn) {
    posts = posts.filter(filterFn);
  }
  if (!posts.length) {
    // R35: while the first page is still in flight, show the shape of the feed.
    // Declaring "nobody has posted yet" and then swapping in real content makes
    // a working app look abandoned to anyone on a slow connection.
    if (window.BACKEND && BACKEND.loading && !searchQuery && !filterFn) {
      grid.innerHTML = skeletonCards(3);
      return;
    }
    // Distinguish "nothing matched your search/filter" from "nobody has posted
    // yet" \u2014 the second one is an invitation, not a dead end.
    const filtering = !!(searchQuery || filterFn);
    grid.innerHTML = filtering
      ? `<div class="empty-state"><span>\uD83D\uDD0D</span><p>${t('empty_no_match')}</p><button class="btn-primary" onclick="renderFeed()">${t('empty_show_all')}</button></div>`
      : `<div class="empty-state"><span>\uD83C\uDF31</span><p>${t('empty_be_first')}</p><button class="btn-primary" onclick="openPostModal()">${t('empty_post_now')}</button></div>`;
    return;
  }
  posts.forEach(p => grid.insertAdjacentHTML('beforeend', p.feedType === 'stock' ? buildStockCard(p) : buildPagiaCard(p)));
}

function getPost(id, ft) {
  return ft === 'stock' ? stockPosts.find(p=>p.id===id) : pagiaPosts.find(p=>p.id===id);
}

// =====================================================================
// R39 — report and block, from the listing itself
// A marketplace without these gets spam before it gets users, and the
// person who needs them needs them at the moment they see the listing —
// not buried in settings.
// =====================================================================
function openReportSheet(id, ft) {
  const post = getPost(id, ft);
  if (!post) return;
  if (post.dbId && typeof isLoggedIn === 'function' && !isLoggedIn()) { requireLogin('login_to_report'); return; }
  const reasons = [
    ['spam', t('report_spam')],
    ['offensive', t('report_offensive')],
    ['scam', t('report_scam')],
    ['wrong', t('report_wrong')],
    ['other', t('report_other')],
  ];
  const seller = post.user || {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'report-overlay';
  overlay.onclick = e => { if (e.target === overlay) closeReportSheet(); };
  overlay.innerHTML = `<div class="modal report-modal">
    <div class="modal-header">
      <h3>${t('report_title')}</h3>
      <button class="modal-close" onclick="closeReportSheet()">✕</button>
    </div>
    <div class="modal-body">
      <p class="report-sub">${esc(post.product)}</p>
      <div class="report-reasons">
        ${reasons.map(([v, label]) => `<button class="report-reason" onclick="submitReport(${Number(id)},'${ft === 'stock' ? 'stock' : 'pagia'}','${v}')">${label}</button>`).join('')}
      </div>
      <div class="report-divider"></div>
      <button class="report-block" data-act="block">
        🚫 ${t('block_user')} — ${esc(seller.isBusiness ? (seller.bizName || seller.name) : seller.name)}
      </button>
      <p class="report-note">${t('block_note')}</p>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  // R40: the block button used to carry the seller's name inside an onclick
  // string. esc() turns ' into &#39;, which the HTML parser decodes back to a
  // real quote before the handler is compiled — so a display name of
  // `');alert(1)//` executed. Nothing user-derived goes into markup; the
  // handler closes over the values instead.
  // It also received post.user.id — "db-<client_id>", a browser id — while
  // user_blocks.blocked_id is a uuid. Every block failed on a type error.
  // The account id is post.ownerUid.
  overlay.querySelector('[data-act="block"]')?.addEventListener('click', () => {
    confirmBlock(post.ownerUid, seller.isBusiness ? (seller.bizName || seller.name) : seller.name);
  });
  document.body.style.overflow = 'hidden';
}
function closeReportSheet() {
  const o = document.getElementById('report-overlay');
  if (o) o.remove();
  // R40: the detail modal underneath may still be open — only release the
  // page scroll if nothing else is holding it.
  if (!document.querySelector('.modal-overlay:not(.hidden)')) document.body.style.overflow = '';
}
async function submitReport(id, ft, reason) {
  const post = getPost(id, ft);
  closeReportSheet();
  if (!post) return;
  if (!post.dbId) { showToast('✅ ' + t('report_thanks')); return; }   // demo listing
  const r = await backendReportPost(post, reason);
  if (r.ok) showToast('✅ ' + t('report_thanks'));
  else if (r.msg) showToast('⚠️ ' + r.msg);
}
async function confirmBlock(uid, name) {
  closeReportSheet();
  if (!uid) { showToast('⚠️ ' + t('block_unavailable')); return; }
  if (!confirm(t('block_confirm', { x: name || '' }))) return;
  const r = await backendBlockUser(uid);
  if (r.ok) showToast('🚫 ' + t('block_done'));
  else if (r.msg) showToast('⚠️ ' + r.msg);
}
window.openReportSheet = openReportSheet;
window.closeReportSheet = closeReportSheet;
window.submitReport = submitReport;
window.confirmBlock = confirmBlock;

// R37: comment threads load only when opened, so the card can't count the
// array — it reads the trigger-maintained counter that came with the row.
// Demo posts have no counter and fall back to the array they carry.
// Renders whatever the database returned for a search, merged with anything
// already in memory so a result you can see doesn't disappear and come back.
function renderSearchResults(hits, query) {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  const seen = new Set();
  const merged = [];
  hits.forEach(h => {
    const known = [...pagiaPosts, ...stockPosts].find(p => p.dbId && String(p.dbId) === String(h.dbId));
    const post = known || h;
    if (!known) (h.feedType === 'stock' ? stockPosts : pagiaPosts).push(h);
    const k = postKey(post);
    if (k && !seen.has(k)) { seen.add(k); merged.push(post); }
  });
  if (!merged.length) {
    grid.innerHTML = `<div class="empty-state"><span>🔍</span><p>${t('empty_no_match')}</p><button class="btn-primary" onclick="renderFeed()">${t('empty_show_all')}</button></div>`;
    return;
  }
  grid.innerHTML = merged.map(p => p.feedType === 'stock' ? buildStockCard(p) : buildPagiaCard(p)).join('');
}
window.renderSearchResults = renderSearchResults;

function commentCountOf(post) {
  if (post && typeof post.commentCount === 'number') return post.commentCount;
  return (post && post.comments) ? post.comments.length : 0;
}
window.commentCountOf = commentCountOf;

// Placeholder cards shaped like the real thing: avatar + two lines of header,
// the 16:10 media block, a title, a line of body, and the action row.
function skeletonCards(n) {
  const one = `<article class="product-card skeleton-card" aria-hidden="true">
    <div class="card-header">
      <div class="sk sk-avatar"></div>
      <div class="card-user-info" style="flex:1">
        <div class="sk sk-line" style="width:38%"></div>
        <div class="sk sk-line sk-sm" style="width:58%"></div>
      </div>
    </div>
    <div class="sk sk-media"></div>
    <div class="card-body">
      <div class="sk sk-line" style="width:52%"></div>
      <div class="sk sk-line sk-sm" style="width:86%"></div>
      <div class="sk-badges"><span class="sk sk-pill"></span><span class="sk sk-pill"></span><span class="sk sk-pill"></span></div>
    </div>
    <div class="card-footer">
      <span class="sk sk-btn"></span><span class="sk sk-btn"></span><span class="sk sk-btn"></span><span class="sk sk-btn"></span>
    </div>
  </article>`;
  return one.repeat(Math.max(1, n || 3));
}
window.skeletonCards = skeletonCards;

// R31 — bundled demo listings.
// They exist so the app is alive with no backend. Once a real backend IS
// connected they are hidden: a marketplace must not show invented products
// next to genuine ones, and a visitor has no way to tell them apart.
// Set this to true if you want them on screen for a presentation.
const SHOW_DEMO_WHEN_LIVE = false;
function liveFiltered(arr) {
  if (SHOW_DEMO_WHEN_LIVE) return arr;
  // `loading` counts as live: if a real backend is on its way, showing demo
  // listings for a second and then yanking them away is a content flash. The
  // feed shows skeletons for that moment instead. Only once we know there is
  // no backend do the demo listings become the content.
  if (!(window.BACKEND && (BACKEND.ready || BACKEND.loading))) return arr;
  return arr.filter(p => p.dbId);
}
window.liveFiltered = liveFiltered;

function buildPagiaCard(post) {
  const dl = Math.ceil((post.expiry - today)/(864e5));
  const urg = dl<=1 ? 'urgent':'';
  const exp = dl===0?('\u26A1 '+t('expiry_today')):dl===1?('\u23F0 '+t('expiry_tomorrow')):('\uD83D\uDCC5 '+t('expiry_days',{n:dl}));
  const pr  = post.free?('\uD83C\uDD93 '+t('price_free')):`\u20AA${post.price}`;
  const img = mediaTag(post, 'pagia');
  return `<article class="product-card${post.taken ? ' is-taken' : ''}" id="post-${post.id}">
    ${post.taken ? `<div class="taken-ribbon">${t('status_taken')}</div>` : ''}
    <div class="card-header">
      <div class="card-avatar"><img src="${safeUrl(post.user.avatar)}" alt="${esc(post.user.name)}"/></div>
      <div class="card-user-info"><div class="card-user-name">${esc(post.user.name)}</div><div class="card-meta">${esc(post.location)} \u00B7 ${esc(post.time)}</div></div>
    </div>${img}
    <div class="card-body">
      <div class="card-title">${esc(post.product)}</div>
      <p class="card-desc">${esc(post.desc)}</p>
      <div class="card-badges">
        <span class="badge badge-expiry ${urg}">${exp}</span>
        <span class="badge badge-price">${pr}</span>
        <span class="badge badge-cat">${esc(post.category)}</span>
      </div>
    </div>
    <div class="card-footer">
      <button class="action-btn${post.liked?' liked':''}" onclick="toggleLike(${post.id},'pagia')">${post.liked?'\u2764\uFE0F':'\uD83E\uDD0D'} <span id="lc-${post.id}">${post.likes}</span></button>
      <button class="action-btn" onclick="toggleComments(${post.id},'pagia')">\uD83D\uDCAC ${commentCountOf(post)}</button>
      <button class="action-btn chat-action" onclick="openChatFromPost(${post.id},'pagia')">\u2709\uFE0F ${t('btn_chat')}</button>
      <button class="action-btn save-action" onclick="toggleSave(${post.id},'pagia')">${isSaved(post,'pagia')?'\uD83D\uDD16':'\uD83C\uDFF7\uFE0F'} ${t('btn_save')}</button>
    </div>
    <div class="comments-section" id="comments-${post.id}" style="display:none">${buildComments(post,'pagia')}</div>
  </article>`;
}

function buildStockCard(post) {
  const biz = post.user.isBusiness;
  const sellerBadge = biz?`<span class="biz-badge">\uD83C\uDFE2 ${esc(post.user.bizName)}</span>`:`<span class="private-seller-badge">\uD83D\uDC64 ${t('badge_private')}</span>`;
  const discBanner = post.discountPct>0?`<div class="discount-banner">-${post.discountPct}%</div>`:'';
  const img = `<div class="card-image-wrap" style="position:relative">${discBanner}${mediaTag(post,'stock')}</div>`;
  const priceHtml = post.originalPrice>0
    ?`<div class="price-compare"><span class="price-original">\u20AA${post.originalPrice}</span><span class="price-sale">\u20AA${post.salePrice}</span><span class="price-savings">${t('savings',{n:post.originalPrice-post.salePrice})}</span></div>`
    :`<div class="price-compare"><span class="price-sale">\u20AA${post.salePrice}</span></div>`;
  return `<article class="product-card${post.taken ? ' is-taken' : ''}" id="post-${post.id}" style="border-top:2px solid rgba(255,169,77,0.25)">
    ${post.taken ? `<div class="taken-ribbon">${t('status_sold')}</div>` : ''}
    <div class="card-header">
      <div class="card-avatar"><img src="${safeUrl(post.user.avatar)}" alt="${esc(post.user.name)}"/></div>
      <div class="card-user-info">
        <div class="card-user-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(biz?post.user.bizName:post.user.name)}${sellerBadge}</div>
        <div class="card-meta">${esc(post.location)} \u00B7 ${esc(post.time)}</div>
      </div>
    </div>${img}
    <div class="card-body">
      <div class="stock-feed-label">\uD83C\uDFF7\uFE0F ${t('stock_label')} \u00B7 ${esc(post.category)}</div>
      <div class="card-title">${esc(post.product)}</div>
      <p class="card-desc">${esc(post.desc)}</p>
      ${priceHtml}
      <div class="card-badges">
        <span class="badge badge-location">\uD83D\uDCCD ${esc(post.location)}</span>
        <span class="badge qty-badge">\uD83D\uDCE6 ${t('units',{n:post.quantity})}</span>
        ${post.tags.slice(0,2).map(tag=>`<span class="badge badge-cat">${esc(tag)}</span>`).join('')}
      </div>
    </div>
    <div class="card-footer">
      <button class="action-btn${post.liked?' liked':''}" onclick="toggleLike(${post.id},'stock')">${post.liked?'\u2764\uFE0F':'\uD83E\uDD0D'} <span id="lc-${post.id}">${post.likes}</span></button>
      <button class="action-btn" onclick="toggleComments(${post.id},'stock')">\uD83D\uDCAC ${commentCountOf(post)}</button>
      <button class="action-btn" style="color:var(--accent3)" onclick="openChatFromPost(${post.id},'stock')">\u2709\uFE0F ${t('btn_chat_seller')}</button>
      <button class="action-btn save-action" onclick="toggleSave(${post.id},'stock')">${isSaved(post,'stock')?'\uD83D\uDD16':'\uD83C\uDFF7\uFE0F'}</button>
    </div>
    <div class="comments-section" id="comments-${post.id}" style="display:none">${buildComments(post,'stock')}</div>
  </article>`;
}

function buildComments(post, ft) {
  const items = post.comments.map(c=>`<div class="comment-item"><div class="comment-avatar"><img src="${safeUrl(c.user.avatar)}" alt="${esc(c.user.name)}"/></div><div class="comment-bubble"><div class="comment-user">${esc(c.user.name)}</div><div class="comment-text">${esc(c.text)}</div><div class="comment-time">${esc(c.time)}</div></div></div>`).join('');
  return `<div class="comment-list">${items||('<div style="color:var(--text-secondary);font-size:0.85rem;padding:8px 0">'+t('comment_first')+'</div>')}</div>
    <div class="comment-input-row"><img src="${safeUrl(ME.avatar)}" style="width:32px;height:32px;border-radius:50%;flex-shrink:0" alt="me"/>
    <input type="text" placeholder="${t('comment_ph')}" id="ci-${post.id}" onkeypress="if(event.key==='Enter')addComment(${post.id},'${ft}')"/>
    <button class="comment-send-btn" onclick="addComment(${post.id},'${ft}')">&#x27A4;</button></div>`;
}

function toggleComments(id, ft) {
  const post = getPost(id, ft);
  if (!post) return;
  post.showComments = !post.showComments;
  const sec = document.getElementById('comments-'+id);
  if (!post.showComments) { sec.style.display='none'; return; }
  sec.style.display='block';
  sec.innerHTML=buildComments(post,ft);
  setTimeout(()=>sec.querySelector('input')?.focus(),50);
  // R37: fetch the thread on demand rather than with the feed
  if (post.dbId && !post._commentsLoaded && typeof backendLoadComments === 'function') {
    backendLoadComments(post).then(() => { if (post.showComments) refreshCommentUI(post, ft); });
  }
}

function refreshCommentUI(post, ft) {
  const sec = document.getElementById('comments-' + post.id);
  if (sec) {
    sec.innerHTML = buildComments(post, ft);
    const inp = sec.querySelector('input');
    if (inp) inp.focus();
  }
  const btn = document.querySelector(`#post-${post.id} .card-footer .action-btn:nth-child(2)`);
  if (btn) btn.textContent = `\uD83D\uDCAC ${commentCountOf(post)}`;
}

// R30: comments are written to the DB. They used to be pushed into an in-memory
// array only \u2014 gone on refresh, invisible to everyone else.
function addComment(id, ft) {
  const post = getPost(id, ft);
  const inp  = document.getElementById('ci-'+id);
  if (!post||!inp||!inp.value.trim()) return;
  const text = inp.value.trim();
  if (post.dbId && typeof isLoggedIn === 'function' && !isLoggedIn()) { requireLogin('login_to_comment'); return; }
  inp.value = '';

  // Optimistic: show it immediately, reconcile with the server row after.
  const local = { user: ME, text, time: '\u05E2\u05DB\u05E9\u05D9\u05D5', _pending: true };
  post.comments.push(local);
  if (typeof post.commentCount === 'number') post.commentCount++;
  refreshCommentUI(post, ft);

  if (post.dbId && typeof backendAddComment === 'function') {
    backendAddComment(post, text).then(saved => {
      const i = post.comments.indexOf(local);
      if (i < 0) return;
      if (saved) post.comments[i] = saved;
      else {
        post.comments.splice(i, 1);
        if (typeof post.commentCount === 'number') post.commentCount = Math.max(0, post.commentCount - 1);
        showToast('\u26A0\uFE0F ' + t('comment_failed'));
      }
      refreshCommentUI(post, ft);
    });
  }
}

function paintLike(post) {
  const btn = document.querySelector(`#post-${post.id} .card-footer .action-btn`);
  if (!btn) return;
  btn.classList.toggle('liked', post.liked);
  btn.innerHTML = `${post.liked ? '\u2764\uFE0F' : '\uD83E\uDD0D'} <span id="lc-${post.id}">${Number(post.likes) || 0}</span>`;
}

// R30: a like is now a row in the DB, so the count is real and shared. On a
// real post it requires login; the UI updates first and rolls back if the
// write is rejected.
function toggleLike(id, ft) {
  const post = getPost(id, ft);
  if (!post) return;
  if (post.dbId && typeof isLoggedIn === 'function' && !isLoggedIn()) { requireLogin('login_to_like'); return; }
  const wasLiked = post.liked;
  post.liked = !wasLiked;
  post.likes = Math.max(0, (Number(post.likes) || 0) + (post.liked ? 1 : -1));
  paintLike(post);
  const btn = document.querySelector(`#post-${id} .card-footer .action-btn`);
  if (btn) btn.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 200 });

  if (post.dbId && typeof backendToggleLike === 'function') {
    backendToggleLike(post, post.liked).then(ok => {
      if (ok) return;
      post.liked = wasLiked;
      post.likes = Math.max(0, (Number(post.likes) || 0) + (wasLiked ? 1 : -1));
      paintLike(post);
    });
  }
}

// Single source of truth for saves: savedIds Sets. Also mirrors post.saved
// so freshly-rendered cards show the right icon. Updates card + detail buttons.
function toggleSave(id, ft) {
  const set = ft === 'pagia' ? savedIds.pagia : savedIds.stock;
  const post = getPost(id, ft);
  const key = postKey(post);
  if (!key) return;
  const nowSaved = !set.has(key);
  if (nowSaved) set.add(key); else set.delete(key);
  persistSaved();
  if (post) post.saved = nowSaved;
  const label = ft === 'pagia'
    ? `${nowSaved?'\uD83D\uDD16':'\uD83C\uDFF7\uFE0F'} \u05E9\u05DE\u05D5\u05E8`
    : (nowSaved?'\uD83D\uDD16':'\uD83C\uDFF7\uFE0F');
  document.querySelectorAll(`#post-${id} .save-action`).forEach(btn=>{
    btn.classList.toggle('saved', nowSaved);
    btn.innerHTML = label;
  });
  const dbtn = document.querySelector('#detail-content .detail-save-btn');
  if (dbtn) dbtn.innerHTML = label;
  showToast(nowSaved?('\uD83D\uDD16 '+t('toast_saved')):t('toast_unsaved'));
  updateProfileStats();
  const savedPage = document.getElementById('page-saved');
  if (savedPage && savedPage.classList.contains('active')) renderSaved('all');
}

// "Near me" used to be hardcoded to Tel Aviv + Jerusalem, so the cities and
// neighbourhoods you set in ⚙️ (R27) had no effect on the feed at all — they
// only ever filtered notifications. Now it reads the same settings.
function isNearMe(p) {
  const s = (typeof getSettings === 'function') ? getSettings() : null;
  const mine = s ? s.cities.concat(s.areas).map(x => (x || '').trim()).filter(Boolean) : [];
  if (!mine.length) return true;
  const loc = (p.location || '').trim();
  return mine.some(n => loc.includes(n));
}
window.isNearMe = isNearMe;

function filterPagia(el, type) {
  document.querySelectorAll('#pagia-controls .filter-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  if (type==='all')    renderFeed();
  if (type==='today')  renderFeed(null, p=>Math.ceil((p.expiry-today)/864e5)<=1);
  if (type==='nearby') renderFeed(null, isNearMe);
  if (type==='free')   renderFeed(null, p=>p.free);
}

function filterStock(el, type) {
  document.querySelectorAll('#stock-controls .filter-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  if (type==='all')      renderFeed();
  if (type==='business') renderFeed(null, p=>p.user.isBusiness);
  if (type==='private')  renderFeed(null, p=>!p.user.isBusiness);
  if (type==='deal')     renderFeed(null, p=>p.discountPct>=50);
}

function filterByCity(city) {
  showPage('feed');
  currentFeedType = exploreFeedMode;
  document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'));
  const tab = document.getElementById('tab-'+exploreFeedMode);
  if (tab) tab.classList.add('active');
  document.getElementById('pagia-controls').classList.toggle('hidden', exploreFeedMode!=='pagia');
  document.getElementById('stock-controls').classList.toggle('hidden', exploreFeedMode!=='stock');
  renderFeed(null, p=>p.location.includes(city));
  showToast('\uD83D\uDDFA\uFE0F ' + t('toast_showing_city',{x:city}));
}

function filterByTag(tag) {
  showPage('feed');
  const stockTags=['\u05E0\u05D9\u05E7\u05D9\u05D5\u05DF','\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4','\u05E1\u05D8\u05D5\u05E7'];
  currentFeedType = stockTags.includes(tag)?'stock':'pagia';
  document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+currentFeedType).classList.add('active');
  document.getElementById('pagia-controls').classList.toggle('hidden', currentFeedType!=='pagia');
  document.getElementById('stock-controls').classList.toggle('hidden', currentFeedType!=='stock');
  renderFeed(null, p=>p.tags.includes(tag)||p.category===tag);
  showToast('\uD83C\uDFF7\uFE0F ' + t('toast_showing_tag',{x:tag}));
}

function setExploreMode(mode, btn) {
  exploreFeedMode=mode;
  document.querySelectorAll('.explore-toggle-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function openDetail(id, ft) {
  const post=getPost(id,ft);
  if (!post) return;
  let html='';
  if (ft==='pagia') {
    const dl=Math.ceil((post.expiry-today)/864e5);
    const exp=dl<=0?('\u26A1 '+t('expiry_today')):('\uD83D\uDCC5 '+t('expiry_days',{n:dl}));
    const pr=post.free?('\uD83C\uDD93 '+t('price_free')):`\u20AA${post.price}`;
    const imgH=mediaTag(post,ft,{detail:true});
    html=`${imgH}<div class="detail-body"><h2 class="detail-title">${esc(post.product)}</h2>
      <div class="detail-user"><img src="${safeUrl(post.user.avatar)}" alt="${esc(post.user.name)}"/><div><div class="detail-user-name">${esc(post.user.name)}</div><div class="detail-user-location">\uD83D\uDCCD ${esc(post.location)} \u00B7 ${esc(post.time)}</div></div></div>
      <div class="card-badges" style="margin-bottom:16px"><span class="badge badge-expiry">${exp}</span><span class="badge badge-price">${pr}</span>${post.tags.map(tag=>`<span class="badge badge-cat">${esc(tag)}</span>`).join('')}</div>
      <p class="detail-desc">${esc(post.desc)}</p>
      <div class="detail-actions">
        <button class="detail-chat-btn" onclick="openChatFromPost(${id},'pagia');closeDetailModal()">\uD83D\uDCAC ${t('detail_send_msg')}</button>
        <button class="detail-save-btn" onclick="toggleSave(${id},'pagia')">${isSaved(post,'pagia')?'\uD83D\uDD16':'\uD83C\uDFF7\uFE0F'} ${t('btn_save')}</button>
      </div></div>`;
  } else {
    const imgH=mediaTag(post,ft,{detail:true});
    const prH=post.originalPrice>0?`<div class="price-compare" style="margin-bottom:16px"><span class="price-original">\u20AA${post.originalPrice}</span><span class="price-sale">\u20AA${post.salePrice}</span><span class="price-savings">${t('savings',{n:post.originalPrice-post.salePrice})} (${post.discountPct}%)</span></div>`:`<div class="price-compare" style="margin-bottom:16px"><span class="price-sale">\u20AA${post.salePrice}</span></div>`;
    const sB=post.user.isBusiness?`<span class="biz-badge">\uD83C\uDFE2 ${t('seller_business_verified')} \u2013 ${esc(post.user.bizName)}</span>`:`<span class="private-seller-badge">\uD83D\uDC64 ${t('seller_private_label')}</span>`;
    html=`${imgH}<div class="detail-body"><div style="margin-bottom:12px">${sB}</div><h2 class="detail-title">${esc(post.product)}</h2>
      <div class="detail-user"><img src="${safeUrl(post.user.avatar)}" alt="${esc(post.user.name)}"/><div><div class="detail-user-name">${esc(post.user.isBusiness?post.user.bizName:post.user.name)}</div><div class="detail-user-location">\uD83D\uDCCD ${esc(post.location)} \u00B7 ${esc(post.time)}</div></div></div>
      ${prH}<div class="card-badges" style="margin-bottom:16px"><span class="badge qty-badge">\uD83D\uDCE6 ${Number(post.quantity)||1} \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA</span>${post.tags.map(tag=>`<span class="badge badge-cat">${esc(tag)}</span>`).join('')}</div>
      <p class="detail-desc">${esc(post.desc)}</p>
      <div class="detail-actions">
        <button class="detail-chat-btn" style="background:linear-gradient(135deg,var(--accent3),#ee5a24)" onclick="openChatFromPost(${id},'stock');closeDetailModal()">\uD83D\uDCAC ${t('detail_chat_with')} ${esc(post.user.isBusiness?post.user.bizName:post.user.name)}</button>
        <button class="detail-save-btn" onclick="toggleSave(${id},'stock')">${isSaved(post,'stock')?'\uD83D\uDD16':'\uD83C\uDFF7\uFE0F'}</button>
      </div></div>`;
  }
  document.getElementById('detail-content').innerHTML=html;
  // R41: the card only had the summary — pull the full description now.
  if (post.dbId && !post._fullDesc && typeof backendLoadFullPost === 'function') backendLoadFullPost(post);
  document.getElementById('detail-modal-overlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
  // Owner-only controls: delete + edit (real posts you own)
  const actions = document.querySelector('#detail-content .detail-actions');
  if (actions && isMine(post)) {
    const del = document.createElement('button');
    del.className = 'owner-btn danger';
    del.innerHTML = '\ud83d\uddd1\ufe0f ' + t('btn_delete');
    del.onclick = () => deletePost(id, ft);
    actions.appendChild(del);
    const ed = document.createElement('button');
    ed.className = 'owner-btn';
    ed.innerHTML = '\u270f\ufe0f ' + t('btn_edit');
    ed.onclick = () => editPost(id, ft);
    actions.appendChild(ed);
    // Marking taken/sold is the owner's call \u2014 RLS only lets the owner update
    // the row, so offering it to everyone (as before) could never have worked.
    if (!post.taken) {
      const mk = document.createElement('button');
      mk.className = 'mark-taken-btn';
      mk.textContent = ft === 'pagia' ? ('\u2705 ' + t('mark_taken')) : ('\u2705 ' + t('mark_sold'));
      mk.onclick = () => markTaken(id, ft);
      actions.appendChild(mk);
    }
  }
  if (post.taken) {
    const note = document.createElement('div');
    note.className = 'taken-note';
    note.textContent = ft === 'pagia' ? t('status_taken') : t('status_sold');
    if (actions) actions.appendChild(note);
  }
  // R39: report / block — on anything that isn't yours.
  if (actions && !isMine(post)) {
    const rep = document.createElement('button');
    rep.className = 'report-btn';
    rep.textContent = '⚑ ' + t('report_action');
    rep.onclick = () => openReportSheet(id, ft);
    actions.appendChild(rep);
  }
}

// Delete/edit are wired by backend.js (DB). Fallbacks for demo mode:
function deletePost(id, ft) {
  const p = getPost(id, ft); if (!p) return;
  if (!confirm(t('delete_confirm'))) return;
  const arr = ft === 'stock' ? stockPosts : pagiaPosts;
  const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1);
  try { closeDetailModal(); } catch (e) {}
  renderFeed(); renderExpirySoon(); renderDealsWidget();
  showToast('\ud83d\uddd1\ufe0f ' + t('post_deleted'));
}
function editPost(id, ft) {
  const p = getPost(id, ft); if (!p) return;
  editingPost = p;
  openPostModal();
  // prefill
  setTimeout(() => {
    const set = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v; };
    selectPostType(ft);
    set('new-product-name', p.product);
    set('new-product-location', p.location);
    set('new-product-desc', p.desc);
    if (ft === 'pagia') set('new-product-price', p.price || 0);
    else { set('new-original-price', p.originalPrice || 0); set('new-sale-price', p.salePrice || 0); set('new-quantity', p.quantity || 1); }
  }, 60);
}
window.deletePost = deletePost;
window.editPost = editPost;
let editingPost = null;

function closeDetailModal(e) {
  if (e&&e.target!==document.getElementById('detail-modal-overlay')) return;
  document.getElementById('detail-modal-overlay').classList.add('hidden');
  document.body.style.overflow='';
}

function openPostModal() {
  if (!editingPost && typeof requireLogin === 'function' && !requireLogin('login_to_post')) return;
  document.getElementById('post-modal-overlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
  if (!editingPost) selectPostType(currentFeedType==='stock'?'stock':'pagia');
}
function closePostModal(e) {
  // A click inside the modal must not close it — bail before touching state.
  if (e&&e.target!==document.getElementById('post-modal-overlay')) return;
  document.getElementById('post-modal-overlay').classList.add('hidden');
  document.body.style.overflow='';
  // R40: edit mode used to survive a cancelled edit, so the NEXT listing you
  // wrote silently overwrote the one you had opened rather than creating a
  // new one. It is cleared here and in resetPostForm, not only on save.
  editingPost = null;
  resetPostForm();
}

// R34: the three composer buttons each promised something different —
// "photo / video", "stock / sale", "pagia" — and all three called
// openPostModal() with no argument, landing you in the identical default
// state. Now each one takes you where its label says.
function openComposer(mode) {
  openPostModal();
  if (mode === 'stock' || mode === 'pagia') {
    try { selectPostType(mode); } catch (e) {}
  } else if (mode === 'media') {
    // let the modal paint before opening the file picker
    setTimeout(() => { const i = document.getElementById('img-input'); if (i) i.click(); }, 150);
  }
}
window.openComposer = openComposer;

function selectPostType(type) {
  currentPostType=type;
  document.getElementById('ptype-pagia').classList.toggle('active', type==='pagia');
  document.getElementById('ptype-stock').classList.toggle('active', type==='stock');
  document.getElementById('expiry-field').classList.toggle('hidden', type==='stock');
  document.getElementById('stock-price-field').classList.toggle('hidden', type!=='stock');
  document.getElementById('quantity-field').classList.toggle('hidden', type!=='stock');
}

function selectSellerType(type) {
  currentSellerType=type;
  document.getElementById('biz-name-group').classList.toggle('hidden', type!=='business');
}

function calcDiscount() {
  const o=parseFloat(document.getElementById('new-original-price').value)||0;
  const s=parseFloat(document.getElementById('new-sale-price').value)||0;
  if (o>0&&s>0) showToast(`\uD83D\uDCB0 \u05D4\u05E0\u05D7\u05D4 \u05E9\u05DC ${Math.round((1-s/o)*100)}%`);
}

let pendingMedia = null;
function previewImage(e) {
  const file=e.target.files[0]; if (!file) return;
  const isVideo = (file.type||'').startsWith('video');
  const r=new FileReader();
  r.onload=ev=>{
    const src=ev.target.result;
    pendingMedia = { src, type: isVideo?'video':'image' };
    const img=document.getElementById('image-preview');
    const vid=document.getElementById('video-preview');
    document.getElementById('upload-placeholder').classList.add('hidden');
    if (isVideo) {
      if (vid){ vid.src=src; vid.classList.remove('hidden'); }
      if (img){ img.classList.add('hidden'); img.src=''; }
    } else {
      if (img){ img.src=src; img.classList.remove('hidden'); }
      if (vid){ vid.classList.add('hidden'); vid.src=''; }
    }
  };
  r.readAsDataURL(file);
}

function toggleFree(el) {
  const p=document.getElementById('new-product-price');
  p.value=el.checked?'0':''; p.disabled=el.checked;
}
function toggleTag(el){el.classList.toggle('selected');}

function publishPost() {
  const name=document.getElementById('new-product-name').value.trim();
  const loc =document.getElementById('new-product-location').value.trim();
  const desc=document.getElementById('new-product-desc').value.trim();
  const cat =document.getElementById('new-product-cat').value;
  const bizN=document.getElementById('new-biz-name').value.trim();
  if (!name||!loc) { showToast('\u26A0\uFE0F ' + t('toast_fill_name_loc')); return; }
  const selTags=[...document.querySelectorAll('.form-tag.selected')].map(t=>t.dataset.tag);
  // ---- EDIT MODE: update the existing post instead of creating a new one ----
  if (editingPost) {
    const p = editingPost;
    p.product = name; p.location = loc; p.desc = desc || p.desc; p.category = cat; p.emoji = getCatEmoji(cat);
    if (p.feedType === 'pagia') { p.price = parseFloat(document.getElementById('new-product-price').value) || 0; }
    else {
      p.originalPrice = parseFloat(document.getElementById('new-original-price').value) || 0;
      p.salePrice = parseFloat(document.getElementById('new-sale-price').value) || 0;
      p.quantity = parseInt(document.getElementById('new-quantity').value) || 1;
      p.discountPct = p.originalPrice > 0 ? Math.round((1 - p.salePrice / p.originalPrice) * 100) : 0;
    }
    if (typeof backendUpdatePost === 'function') backendUpdatePost(p);
    editingPost = null;
    closePostModal(); renderFeed(); renderExpirySoon(); renderDealsWidget(); resetPostForm();
    showToast('✅ ' + t('post_updated'));
    return;
  }

  const imgSrc = pendingMedia ? pendingMedia.src : null;
  const mediaType = pendingMedia ? pendingMedia.type : 'image';
  const isBiz=currentSellerType==='business';
  const pUser=isBiz?{...ME,isBusiness:true,bizName:bizN||'\u05D4\u05E2\u05E1\u05E7 \u05E9\u05DC\u05D9',avatar:`https://api.dicebear.com/7.x/avataaars/svg?seed=MyBiz&backgroundColor=ffeaa7`}:ME;

  if (currentPostType==='pagia') {
    const exp=document.getElementById('new-product-expiry').value;
    const pr =parseFloat(document.getElementById('new-product-price').value)||0;
    const fr =document.getElementById('free-check').checked;
    if (!exp) { showToast('\u26A0\uFE0F ' + t('toast_pick_expiry')); return; }
    if (fr) selTags.push('\u05D7\u05D9\u05E0\u05DD');
    pagiaPosts.unshift({id:nextPostId++,ownerUid:(typeof ME!=='undefined'?ME.uid:null),feedType:'pagia',user:pUser,product:name,category:cat,emoji:getCatEmoji(cat),image:imgSrc,mediaType:mediaType,desc:desc||`\u05DE\u05D5\u05E6\u05E8: ${name}`,expiry:new Date(exp),location:loc,price:pr,free:fr,tags:selTags,likes:0,liked:false,saved:false,time:'\u05E2\u05DB\u05E9\u05D9\u05D5',comments:[],showComments:false});
  } else {
    const op=parseFloat(document.getElementById('new-original-price').value)||0;
    const sp=parseFloat(document.getElementById('new-sale-price').value)||0;
    const qt=parseInt(document.getElementById('new-quantity').value)||1;
    if (!sp) { showToast('\u26A0\uFE0F ' + t('toast_enter_sale')); return; }
    if (isBiz&&!bizN) { showToast('\u26A0\uFE0F ' + t('toast_enter_biz')); return; }
    const dp=op>0?Math.round((1-sp/op)*100):0;
    selTags.push(isBiz?'\u05E2\u05E1\u05E7':'\u05E4\u05E8\u05D8\u05D9');
    stockPosts.unshift({id:nextPostId++,ownerUid:(typeof ME!=='undefined'?ME.uid:null),feedType:'stock',user:pUser,product:name,category:cat,emoji:getCatEmoji(cat),image:imgSrc,mediaType:mediaType,desc:desc||`\u05DE\u05D5\u05E6\u05E8: ${name}`,originalPrice:op,salePrice:sp,quantity:qt,location:loc,free:false,tags:selTags,likes:0,liked:false,saved:false,discountPct:dp,time:'\u05E2\u05DB\u05E9\u05D9\u05D5',comments:[],showComments:false});
    currentFeedType='stock';
  }
  closePostModal();
  showPage('feed');
  switchFeed(currentPostType, document.getElementById('tab-'+currentPostType));
  renderFeed(); renderExpirySoon(); renderDealsWidget();
  showToast('\uD83D\uDE80 ' + t('toast_published'));
  resetPostForm();
}

function getCatEmoji(c){const m={'\u05DE\u05D6\u05D5\u05DF':'\uD83C\uDF7D\uFE0F','\u05D7\u05DC\u05D1':'\uD83E\uDD5B','\u05DC\u05D7\u05DD':'\uD83C\uDF5E','\u05D9\u05E8\u05E7\u05D5\u05EA':'\uD83E\uDD66','\u05E4\u05D9\u05E8\u05D5\u05EA':'\uD83C\uDF53','\u05E9\u05EA\u05D9\u05D9\u05D4':'\uD83E\uDD64','\u05E0\u05D9\u05E7\u05D9\u05D5\u05DF':'\uD83E\uDDF9','\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4':'\uD83D\uDC84','\u05D0\u05D7\u05E8':'\uD83D\uDCE6'};return m[c]||'\uD83D\uDCE6';}

function resetPostForm() {
  ['new-product-name','new-product-location','new-product-desc','new-product-price','new-original-price','new-sale-price','new-quantity','new-biz-name'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.disabled=false;}});
  document.getElementById('free-check').checked=false;
  document.getElementById('image-preview').classList.add('hidden');
  const vid=document.getElementById('video-preview'); if(vid){vid.classList.add('hidden');vid.src='';}
  pendingMedia=null;
  document.getElementById('upload-placeholder').classList.remove('hidden');
  document.getElementById('img-input').value='';
  document.querySelectorAll('.form-tag.selected').forEach(t=>t.classList.remove('selected'));
  const rads=document.querySelectorAll('input[name="seller-type"]');
  if (rads[0]) rads[0].checked=true;
  currentSellerType='private';
  document.getElementById('biz-name-group').classList.add('hidden');
  const d=document.getElementById('new-product-expiry');
  if (d) d.value=addDays(1).toISOString().split('T')[0];
}

// Real presence when backend is loaded (DB users); else the conversation's own flag.
function chatStatus(cv) {
  let online = !!cv.online, lastSeen = cv.lastSeen || null;
  const uid = cv.user && cv.user.id;
  if (typeof userIsOnline === 'function' && uid && String(uid).indexOf('db-') === 0) {
    online = userIsOnline(uid);
    lastSeen = userLastSeen(uid);
  }
  let label;
  if (online) label = '<span class="status-dot"></span>' + t('status_online');
  else if (lastSeen) label = t('status_last_seen', { x: new Date(lastSeen).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) });
  else label = t('status_offline');
  return { online, label };
}

// R33: both chat badges were the literal string "2" in the HTML and nothing
// ever updated them — they showed "2 unread" forever, including on a live app
// with no conversations at all, and after you had read everything.
function updateChatBadge() {
  const unread = (typeof CONVERSATIONS !== 'undefined' ? CONVERSATIONS : [])
    .reduce((n, c) => n + (Number(c.unread) || 0), 0);
  ['chat-badge', 'bn-chat-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = unread;
    el.style.display = unread ? '' : 'none';
  });
}
window.updateChatBadge = updateChatBadge;

function renderChatList() {
  updateChatBadge();
  const c=document.getElementById('chat-conversations'); if (!c) return;
  if (!CONVERSATIONS.length) {
    c.innerHTML=`<div class="chat-list-empty"><span style="font-size:2.4rem">💬</span><div class="chat-list-empty-title">${t('chat_empty_none')}</div><div class="chat-list-empty-hint">${t('chat_empty_hint')}</div><button class="btn-primary" style="margin-top:12px" onclick="showPage('feed')">${t('go_to_feed')}</button></div>`;
    return;
  }
  c.innerHTML=CONVERSATIONS.map(cv=>`<div class="chat-convo-item ${activeConvoId===cv.id?'active':''} ${cv.unread>0?'has-unread':''}" onclick="openConversation('${esc(cv.id)}')">
    <div class="chat-convo-avatar"><img src="${safeUrl(cv.user.avatar)}" alt="${esc(cv.user.name)}"/>${chatStatus(cv).online?'<div class="online-dot"></div>':''}</div>
    <div class="chat-convo-info"><div class="chat-convo-name">${esc(cv.user.isBusiness?cv.user.bizName:cv.user.name)}</div><div class="chat-convo-preview">${esc(cv.preview)}</div></div>
    <div class="chat-convo-meta"><div class="chat-convo-time">${esc(cv.time)}</div>${cv.unread>0?`<div class="chat-unread">${Number(cv.unread)}</div>`:''}</div>
  </div>`).join('');
}

function openConversation(id) {
  activeConvoId=id; const cv=CONVERSATIONS.find(c=>c.id===id); if (!cv) return;
  cv.unread=0; renderChatList();
  const win=document.getElementById('chat-window');
  win.innerHTML=`<div class="chat-window-header"><button class="chat-back-btn" onclick="closeConversation()">\u2039</button><img src="${safeUrl(cv.user.avatar)}" alt=""/><div class="chat-window-header-info"><div class="chat-window-header-name">${esc(cv.user.isBusiness?cv.user.bizName:cv.user.name)}${cv.user.isBusiness?' \uD83C\uDFE2':''}</div><div class="chat-window-status ${chatStatus(cv).online?'is-online':''}">${chatStatus(cv).label}</div></div></div>
    ${cv.post ? `<div class="chat-context" onclick="openDetail(${Number(cv.post.id)},'${cv.post.feedType==='stock'?'stock':'pagia'}')">
      ${cv.post.image && cv.post.mediaType!=='video' ? `<img class="chat-context-thumb" src="${safeUrl(cv.post.image)}" data-emoji="${esc(cv.post.emoji)}" onerror="imgFallback(this)"/>` : `<div class="chat-context-thumb chat-context-emoji">${esc(cv.post.emoji)}</div>`}
      <div class="chat-context-info"><div class="chat-context-name">${esc(cv.post.product)}</div><div class="chat-context-price">${esc(cv.post.price)}</div></div>
      <span class="chat-context-link">${t('view_listing')} ›</span>
    </div>` : ''}
    <div class="chat-messages" id="cm-${esc(id)}">${buildMessages(cv)}</div>
    <div class="chat-typing hidden" id="typing-ind"><span></span><span></span><span></span></div>
    <div class="chat-input-bar"><button class="chat-attach-btn" title="${t('attach_media')}" data-act="attach">📎</button><input type="file" class="chat-file-input" accept="image/*,video/*" style="display:none"/><textarea class="chat-input-field" rows="1" placeholder="${t('chat_input_ph')}"></textarea><button data-act="send">${t('send')} &#x27A4;</button></div>`;
  const layout=document.querySelector('.chat-layout'); if (layout) layout.classList.add('convo-open');
  // R40: the input bar is wired with listeners, not with inline handlers that
  // interpolate the conversation id. The id derives from `room`, which the
  // sender of a message chooses freely — putting it inside onclick="" let a
  // crafted room string close the attribute and run script in the recipient's
  // page. Nothing user-derived goes into markup here any more.
  const file = win.querySelector('.chat-file-input');
  const box  = win.querySelector('.chat-input-field');
  const send = () => sendChatMessage(id);
  win.querySelector('[data-act="attach"]')?.addEventListener('click', () => file && file.click());
  file?.addEventListener('change', e => chatSendMedia(id, e));
  win.querySelector('[data-act="send"]')?.addEventListener('click', send);
  box?.addEventListener('input', () => { autoGrow(box); chatTyping(id); });
  box?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  scrollToBottom('cm-'+id);
}

function buildMessages(cv) {
  const msgs = cv.messages;
  return msgs.map((m, i) => {
    const out = m.from === 'me';
    const prev = msgs[i - 1], next = msgs[i + 1];
    const grouped = !!(prev && prev.from === m.from);
    const lastOfRun = !next || next.from !== m.from;
    let avatar = '';
    if (!out) {
      avatar = lastOfRun
        ? `<div class="chat-msg-avatar"><img src="${safeUrl(cv.user.avatar)}" alt=""/></div>`
        : `<div class="chat-msg-avatar spacer"></div>`;
    }
    let body = '';
    const media = safeUrl(m.media);
    if (media) body += m.mediaType === 'video'
      ? `<video class="chat-media" src="${media}" controls playsinline preload="metadata"></video>`
      : `<img class="chat-media" src="${media}" alt="" loading="lazy"/>`;
    if (m.text) body += `<div class="chat-bubble">${esc(m.text)}</div>`;
    if (!body) body = `<div class="chat-bubble"></div>`;
    return `<div class="chat-msg ${out ? 'outgoing' : ''} ${grouped ? 'grouped' : ''}">
      ${avatar}
      <div class="chat-msg-col">${body}<div class="chat-bubble-time">${esc(m.time)}${out ? ` <span class="msg-tick ${m.status === 'read' ? 'read' : ''}">${m.status === 'read' ? '✓✓' : '✓'}</span>` : ''}</div></div>
    </div>`;
  }).join('');
}

// ---- Chat media (photo/video) ----
function chatSendMedia(id, e) {
  const file = e.target.files[0]; if (!file) return;
  const cv = CONVERSATIONS.find(c => c.id === id); if (!cv) return;
  const isVideo = (file.type || '').startsWith('video');
  const r = new FileReader();
  r.onload = ev => deliverChatMedia(cv, ev.target.result, isVideo ? 'video' : 'image');
  r.readAsDataURL(file);
  e.target.value = '';
}
// Local delivery; backend.js overrides this to upload + sync to DB.
function deliverChatMedia(cv, src, type) {
  cv.messages.push({ from: 'me', text: '', media: src, mediaType: type, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), status: 'sent' });
  cv.preview = type === 'video' ? '🎥 ' + t('media_video') : '📷 ' + t('media_photo');
  const msgs = document.getElementById('cm-' + cv.id);
  if (msgs) { msgs.innerHTML = buildMessages(cv); scrollToBottom('cm-' + cv.id); }
  renderChatList();
}
window.chatSendMedia = chatSendMedia;
window.deliverChatMedia = deliverChatMedia;

// Typing indicator + back-button helpers (backend.js wires the realtime side).
function chatTyping(id) { /* overridden by backend.js when connected */ }
function showTyping(cvId, name) {
  const el = document.getElementById('typing-ind');
  if (!el || activeConvoId !== cvId) return;
  el.classList.remove('hidden');
  clearTimeout(showTyping._t);
  showTyping._t = setTimeout(() => el.classList.add('hidden'), 2600);
  scrollToBottom('cm-' + cvId);
}
function closeConversation() {
  activeConvoId = null;
  const layout = document.querySelector('.chat-layout');
  if (layout) layout.classList.remove('convo-open');
  renderChatList();
}
window.chatTyping = chatTyping; window.showTyping = showTyping; window.closeConversation = closeConversation;

function sendChatMessage(id) {
  const inp=document.querySelector('#chat-window .chat-input-field'); if (!inp||!inp.value.trim()) return;
  const cv=CONVERSATIONS.find(c=>c.id===id); if (!cv) return;
  cv.messages.push({from:'me',text:inp.value.trim(),time:new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}),status:'sent'});
  cv.preview=cv.messages[cv.messages.length-1].text; inp.value=''; inp.style.height='auto';
  const msgs=document.getElementById('cm-'+id);
  if (msgs){msgs.innerHTML=buildMessages(cv);scrollToBottom('cm-'+id);}
  renderChatList();
  // No fake auto-reply \u2014 real replies come from the other user via the backend.
}

function openChatFromPost(id, ft) {
  const post=getPost(id,ft); if (!post) return;
  // Match on seller AND product: messaging the same seller about a second item
  // used to reuse the first conversation, so the messages landed in the wrong
  // product's room and the context card showed the wrong item.
  let cv=CONVERSATIONS.find(c=>c.user.id===post.user.id && (!c.post || c.post.id===post.id));
  if (!cv) {
    cv={id:'c'+Date.now(),user:post.user,online:Math.random()>0.4,unread:0,preview:`\u05E9\u05D0\u05DC\u05D4 \u05E2\u05DC "${post.product}"`,time:'\u05E2\u05DB\u05E9\u05D9\u05D5',
      messages:[{from:'me',text:`\u05D4\u05D9\u05D9! \u05E8\u05D0\u05D9\u05EA\u05D9 \u05D0\u05EA "${post.product}" \u05E9\u05DC\u05DA, \u05E2\u05D3\u05D9\u05D9\u05DF \u05D6\u05DE\u05D9\u05DF?`,time:new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}]};
    CONVERSATIONS.unshift(cv);
  }
  cv.post = { id: post.id, feedType: ft, product: post.product, emoji: post.emoji, image: post.image, mediaType: post.mediaType,
    price: ft === 'stock' ? ('₪' + post.salePrice) : (post.free ? t('price_free') : ('₪' + post.price)) };
  showPage('chat'); setTimeout(()=>openConversation(cv.id),100);
}

function renderProfileGrid(tab) {
  const grid=document.getElementById('profile-grid'); if (!grid) return;
  const posts=liveFiltered(tab==='stock'?stockPosts:pagiaPosts).filter(isMine);
  if (!posts.length){grid.innerHTML=`<div style="color:var(--text-secondary);font-size:0.9rem;padding:20px 0;grid-column:1/-1">\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E4\u05E8\u05E1\u05DE\u05EA</div>`;return;}
  grid.innerHTML=posts.map(p=>{
    const s=safeUrl(p.image)?`<img src="${safeUrl(p.image)}" alt="${esc(p.product)}" data-emoji="${esc(p.emoji)}" onerror="imgFallback(this)"/>`:`<div style="background:var(--bg-secondary);width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2.5rem">${esc(p.emoji)}</div>`;
    return `<div class="mini-card" onclick="openDetail(${Number(p.id)},'${tab==='stock'?'stock':'pagia'}')">${s}<div class="mini-card-overlay">\u2764\uFE0F ${Number(p.likes)||0} \u00B7 \uD83D\uDCAC ${p.comments.length}</div></div>`;
  }).join('');
}

function switchProfileTab(tab,btn){document.querySelectorAll('.profile-post-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderProfileGrid(tab);}
// "Edit profile" now opens the full settings editor (name, bio, avatar, cities\u2026).
function openEditProfile(){ if (typeof openSettings === 'function') openSettings(); }

function renderExpirySoon() {
  const list=document.getElementById('expiry-soon-list'); if (!list) return;
  const soon=liveFiltered(pagiaPosts).filter(p=>!p.taken&&Math.ceil((p.expiry-today)/864e5)<=2).sort((a,b)=>a.expiry-b.expiry).slice(0,4);
  // R34: an empty widget is noise. Hide the whole box, don't announce nothing.
  const box = list.closest('.widget');
  if (box) box.style.display = soon.length ? '' : 'none';
  if (!soon.length){list.innerHTML='';return;}
  list.innerHTML=soon.map(p=>{const d=Math.ceil((p.expiry-today)/864e5);return `<div class="expiry-item" onclick="openDetail(${Number(p.id)},'pagia')"><span class="expiry-emoji">${esc(p.emoji)}</span><div class="expiry-info"><div class="expiry-name">${esc(p.product)}</div><div class="expiry-time ${d<=0?'critical':''}">${d<=0?t('expiry_today'):t('expiry_left_short')}</div></div></div>`;}).join('');
}

function renderDealsWidget() {
  const list=document.getElementById('deals-list'); if (!list) return;
  const deals=liveFiltered(stockPosts).filter(p=>!p.taken&&p.discountPct>=50).slice(0,3);
  const box = list.closest('.widget');
  if (box) box.style.display = deals.length ? '' : 'none';
  if (!deals.length){list.innerHTML='';return;}
  list.innerHTML=deals.map(p=>`<div class="deal-item" onclick="showPage('feed');switchFeed('stock',document.getElementById('tab-stock'));openDetail(${Number(p.id)},'stock')"><span class="deal-emoji">${esc(p.emoji)}</span><div class="deal-info"><div class="deal-name">${esc(p.product)}</div><div class="deal-discount">-${Number(p.discountPct)||0}% \u00B7 \u20AA${Number(p.salePrice)||0}</div><div class="deal-biz">${p.user.isBusiness?esc(p.user.bizName):t('badge_private')}</div></div></div>`).join('');
}

// (toggleNotifications is defined once below — the version that also renders the panel.)

function autoGrow(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,130)+'px'; }

function scrollToBottom(id){const el=document.getElementById(id);if(el)setTimeout(()=>el.scrollTop=el.scrollHeight,50);}

let toastTimer;
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2800);}

// =====================
// MOBILE BOTTOM NAV
// =====================
function setActiveBottomNav(id) {
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(id);
  if (btn) btn.classList.add('active');
  // Update chat badge visibility
  const chatBadge = document.querySelector('#bn-chat .bn-badge');
  if (chatBadge) {
    const unread = CONVERSATIONS.reduce((sum, c) => sum + (c.unread || 0), 0);
    if (unread > 0) { chatBadge.textContent = unread; chatBadge.style.display = 'flex'; }
    else chatBadge.style.display = 'none';
  }
}
// =====================
// NOTIFICATIONS SYSTEM (R10)
// =====================
const NOTIFICATIONS = [
  { id:1, type:'comment', user:USERS[1], text:'\u05D4\u05D2\u05D9\u05D1 \u05E2\u05DC \u05D4\u05D7\u05D5\u05DE\u05D5\u05E1 \u05D1\u05D9\u05EA\u05D9', time:'\u05DC\u05E4\u05E0\u05D9 5 \u05D3\u05E7\u05D5\u05EA', unread:true, postId:1, feedType:'pagia' },
  { id:2, type:'like',    user:USERS[7], text:'\u05E1\u05D5\u05E4\u05E8\u05DE\u05E8\u05E7\u05D8 \u05DB\u05D4\u05DF \u05E4\u05E8\u05E1\u05DD \u05E1\u05D8\u05D5\u05E7 \u05D7\u05D3\u05E9', time:'\u05DC\u05E4\u05E0\u05D9 22 \u05D3\u05E7\u05D5\u05EA', unread:true, postId:101, feedType:'stock' },
  { id:3, type:'system',  user:null,     text:'\u05D1\u05E8\u05D5\u05DA \u05D4\u05D1\u05D0 \u05DC\u05E4\u05D2\u05D9\u05D4 \u05D1\u05E2\u05D9\u05E8! \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1 \u05D0\u05DC\u05D9\u05DA \u05DE\u05D7\u05DB\u05D9\u05DD', time:'\u05D0\u05EA\u05DE\u05D5\u05DC', unread:false, postId:null },
  { id:4, type:'chat',    user:USERS[3], text:'\u05E9\u05DC\u05D7 \u05DC\u05DA \u05D4\u05D5\u05D3\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4', time:'\u05DC\u05E4\u05E0\u05D9 \u05E9\u05E2\u05D4', unread:false, postId:null },
];

function renderNotificationsPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = NOTIFICATIONS.map(n => {
    const avatar = n.user
      ? `<img src="${safeUrl(n.user.avatar)}" alt="${esc(n.user.name)}" />`
      : `<span style="font-size:1.4rem">${n.type==='system'?'\uD83C\uDF89':'\uD83D\uDCAC'}</span>`;
    const typeIcon = { comment:'\uD83D\uDCAC', like:'\u2764\uFE0F', chat:'\u2709\uFE0F', system:'\uD83C\uDF89' }[n.type] || '';
    return `
    <div class="notif-item ${n.unread?'unread':''}" onclick="handleNotifClick(${Number(n.id)})">
      <div class="notif-avatar">${avatar}</div>
      <div class="notif-text">
        ${n.user ? `<strong>${esc(n.user.name)}</strong> ` : ''}${esc(n.text)}
        <span class="notif-time">${esc(n.time)}</span>
      </div>
      <span class="notif-type-icon">${typeIcon}</span>
    </div>`;
  }).join('');
}

function handleNotifClick(id) {
  const n = NOTIFICATIONS.find(x => x.id === id);
  if (!n) return;
  n.unread = false;
  updateNotifBadge();
  renderNotificationsPanel();
  if (n.postId) {
    toggleNotifications();
    showPage('feed');
    currentFeedType = n.feedType || 'pagia';
    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + currentFeedType).classList.add('active');
    document.getElementById('pagia-controls').classList.toggle('hidden', currentFeedType !== 'pagia');
    document.getElementById('stock-controls').classList.toggle('hidden', currentFeedType !== 'stock');
    renderFeed();
    setTimeout(() => openDetail(n.postId, n.feedType), 300);
  }
}

function updateNotifBadge() {
  const unread = NOTIFICATIONS.filter(n => n.unread).length;
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

// Override toggleNotifications to also render
const _origToggleNotif = toggleNotifications;
// eslint-disable-next-line no-global-assign
function toggleNotifications() {
  const panel = document.getElementById('notifications-panel');
  const badge = document.getElementById('notif-badge');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    badge.style.display = 'none';
    renderNotificationsPanel();
  }
}

// =====================
// CATEGORY SECTION (R7) – live counts
// =====================


// =====================
// SIMULATE REAL-TIME ACTIVITY (R8)
// =====================
// R31: this simulator exists to make the OFFLINE demo feel alive. It must never
// run against a live backend: it announced posts by people who don't exist, and
// incremented likes on real listings — now that likes are rows in the DB, that
// made the displayed count contradict the database and reset on every reload.
function startLiveActivity() {
  const simulationAllowed = () => !(window.BACKEND && BACKEND.ready);
  const randomActions = [
    () => {
      // New pagia post appears
      const names = ['\u05E9\u05D9\u05E8\u05D4 \u05D1\u05DF', '\u05D9\u05D5\u05E1\u05E3 \u05DC\u05D5\u05D9', '\u05DE\u05D9\u05DB\u05DC \u05D6\u05DA'];
      const products = ['\u05E2\u05D5\u05D2\u05D5\u05EA \u05E9\u05D5\u05E7\u05D5\u05DC\u05D3', '\u05E1\u05DC\u05D8 \u05D0\u05D5\u05E8\u05D6', '\u05E4\u05D9\u05D8\u05D4 \u05D8\u05E8\u05D9\u05D9\u05D4'];
      const p = products[Math.floor(Math.random()*products.length)];
      showToast(`\uD83C\uDF1F ${names[Math.floor(Math.random()*names.length)]} \u05E4\u05E8\u05E1\u05DD: ${p}`);
    },
    () => {
      // Simulate a like — demo posts only, never anything backed by a DB row.
      const allPosts = [...pagiaPosts, ...stockPosts].filter(p => !p.dbId);
      if (!allPosts.length) return;
      const post = allPosts[Math.floor(Math.random()*allPosts.length)];
      post.likes++;
      const el = document.getElementById('lc-' + post.id);
      if (el) { el.textContent = post.likes; el.parentElement.animate([{color:'var(--accent2)'},{color:''}],{duration:600}); }
    },
  ];
  setInterval(() => {
    if (!simulationAllowed()) return;
    if (Math.random() > 0.6) randomActions[Math.floor(Math.random()*randomActions.length)]();
  }, 12000);
}

// =====================
// INIT EXTENSIONS
// =====================
const _origInit = window.addEventListener;
document.addEventListener('DOMContentLoaded', () => {
  renderNotificationsPanel();
  updateNotifBadge();
  startLiveActivity();
  setTimeout(renderCategoryCounts, 500);
  setTimeout(() => { try { renderSidebarStats(); renderLeaderboard(); } catch (e) {} }, 500);
}, { once: true });
// =====================
// SAVED ITEMS (R11 · persisted in R29)
// =====================
// Saves are keyed by the DB id when the post is real, because the local
// numeric id is just a counter and changes on every reload — keying by it
// meant your saved items pointed at random posts after a refresh.
function postKey(post) {
  if (!post) return null;
  return post.dbId ? 'db:' + post.dbId : 'demo:' + post.id;
}

// "Is this post mine?" — a DB post carries the account id (ownerUid); a local
// demo post only has the in-memory user object. Matching on user.id alone made
// your own posts disappear from your profile after every reload, because posts
// reloaded from the DB come back as user "db-<client_id>", never ME.id.
function isMine(post) {
  if (!post) return false;
  if (post.ownerUid && typeof ME !== 'undefined' && ME.uid) return post.ownerUid === ME.uid;
  return !!(post.user && typeof ME !== 'undefined' && post.user.id === ME.id);
}
window.isMine = isMine;
let savedIds = { pagia: new Set(), stock: new Set() };

function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem('pagia_saved') || '{}');
    savedIds.pagia = new Set(Array.isArray(raw.pagia) ? raw.pagia : []);
    savedIds.stock = new Set(Array.isArray(raw.stock) ? raw.stock : []);
  } catch (e) { savedIds = { pagia: new Set(), stock: new Set() }; }
}
function persistSaved() {
  try {
    localStorage.setItem('pagia_saved', JSON.stringify({ pagia: [...savedIds.pagia], stock: [...savedIds.stock] }));
  } catch (e) {}
}
function isSaved(post, ft) {
  const set = ft === 'stock' ? savedIds.stock : savedIds.pagia;
  const k = postKey(post);
  return !!k && set.has(k);
}
loadSaved();
window.isSaved = isSaved;
window.postKey = postKey;

function getSavedPosts(feedFilter = 'all') {
  const results = [];
  if (feedFilter === 'all' || feedFilter === 'pagia') {
    pagiaPosts.filter(p => isSaved(p, 'pagia')).forEach(p => results.push({ ...p, _feedType: 'pagia' }));
  }
  if (feedFilter === 'all' || feedFilter === 'stock') {
    stockPosts.filter(p => isSaved(p, 'stock')).forEach(p => results.push({ ...p, _feedType: 'stock' }));
  }
  return results;
}

function renderSaved(filter, btn) {
  if (btn) {
    document.querySelectorAll('#page-saved .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const grid = document.getElementById('saved-grid');
  if (!grid) return;
  const posts = getSavedPosts(filter || 'all');
  if (!posts.length) {
    grid.innerHTML = `<div class="empty-state"><span>&#x1F516;</span><p>${t('empty_saved')}</p><button class="btn-primary" onclick="showPage(\'feed\')">${t('go_to_feed')}</button></div>`;
    return;
  }
  grid.innerHTML = posts.map(p => renderCard(p, p._feedType)).join('');
  updateProfileStats();
}

// (toggleSave is unified above — single definition using savedIds as source of truth.)

// =====================
// MARK AS TAKEN / SOLD
// =====================
// R29: this used to set post.taken and nothing else — no render path ever read
// the flag, so the button showed a toast and left the post exactly as it was.
// Now the card is visibly marked, the post drops out of the urgent/deals
// widgets, and (for a real post you own) the state is written to the DB.
function markTaken(postId, feedType) {
  const arr = feedType === 'pagia' ? pagiaPosts : stockPosts;
  const post = arr.find(p => p.id === postId);
  if (!post) return;
  post.taken = true;
  if (typeof backendMarkTaken === 'function') backendMarkTaken(post);
  showToast('✅ ' + (feedType === 'pagia' ? t('toast_taken') : t('toast_sold')));
  renderFeed(); renderExpirySoon(); renderDealsWidget(); renderProfileGrid(feedType);
  // Close detail modal
  document.getElementById('detail-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// =====================
// PROFILE STATS (live)
// =====================
function updateProfileStats() {
  const postsEl  = document.getElementById('pstat-posts');
  const savedEl  = document.getElementById('pstat-saved');
  if (postsEl) postsEl.textContent = pagiaPosts.filter(isMine).length + stockPosts.filter(isMine).length;
  if (savedEl)  savedEl.textContent  = savedIds.pagia.size + savedIds.stock.size;
}

// =====================
// CATEGORY COUNTS (R7)
// =====================
// R33: the sidebar stats (127 / 48 / 12) and the "top savers" leaderboard —
// three named people with scores — were hardcoded in index.html. On a live app
// with an empty database that is invented social proof, presented as fact.
// Both are now computed from real data, and hidden when there is none.
function renderSidebarStats() {
  const posts = [...liveFiltered(pagiaPosts), ...liveFiltered(stockPosts)];
  const sellers = new Set(posts.map(p => p.user && p.user.id).filter(Boolean));
  const businesses = new Set(posts.filter(p => p.user && p.user.isBusiness).map(p => p.user.id));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-saved', savedIds.pagia.size + savedIds.stock.size);
  set('stat-sellers', sellers.size);
  set('stat-biz', businesses.size);

  // Nothing real to show yet → hide the block rather than display three zeros.
  const box = document.querySelector('.sidebar-stats');
  if (box) box.style.display = posts.length ? '' : 'none';
}

function renderLeaderboard() {
  const list = document.querySelector('.leaderboard-list');
  const widget = document.querySelector('.leaderboard-widget');
  if (!list || !widget) return;
  const posts = [...liveFiltered(pagiaPosts), ...liveFiltered(stockPosts)];
  const byUser = new Map();
  posts.forEach(p => {
    if (!p.user || !p.user.id) return;
    const cur = byUser.get(p.user.id) || { user: p.user, n: 0 };
    cur.n++; byUser.set(p.user.id, cur);
  });
  const top = [...byUser.values()].sort((a, b) => b.n - a.n).slice(0, 3);
  if (!top.length) { widget.style.display = 'none'; return; }
  widget.style.display = '';
  const medal = ['gold', 'silver', 'bronze'];
  list.innerHTML = top.map((e, i) => `<div class="lb-item">
    <span class="lb-rank ${medal[i]}">${i + 1}</span>
    <img src="${safeUrl(e.user.avatar)}" alt="${esc(e.user.name)}" class="lb-avatar"/>
    <span class="lb-name">${esc(e.user.isBusiness ? (e.user.bizName || e.user.name) : e.user.name)}${e.user.isBusiness ? ' 🏢' : ''}</span>
    <span class="lb-score">${e.n}</span></div>`).join('');
}
window.renderSidebarStats = renderSidebarStats;
window.renderLeaderboard = renderLeaderboard;

function renderCategoryCounts() {
  const catMap = {
    '\u05DE\u05D6\u05D5\u05DF':       'cat-food',
    '\u05D7\u05DC\u05D1':       'cat-dairy',
    '\u05D9\u05E8\u05E7\u05D5\u05EA':      'cat-veg',
    '\u05E0\u05D9\u05E7\u05D9\u05D5\u05DF':     'cat-clean',
    '\u05E7\u05D5\u05E1\u05DE\u05D8\u05D9\u05E7\u05D4': 'cat-cosm',
    '\u05E9\u05EA\u05D9\u05D9\u05D4':      'cat-drinks',
  };
  const all = [...liveFiltered(pagiaPosts), ...liveFiltered(stockPosts)];
  Object.entries(catMap).forEach(([cat, elId]) => {
    const el = document.getElementById(elId);
    if (el) el.textContent = all.filter(p => p.category === cat).length;
  });
}

// renderCard - unified wrapper (used by saved page)
function renderCard(post, feedType) {
  return feedType === 'stock' ? buildStockCard(post) : buildPagiaCard(post);
}
// R11 maintenance pass complete.

// R12 — i18n: re-render all dynamic content when the language changes.
// i18n.js calls window.__rerenderDynamic() after applying static translations.
window.__rerenderDynamic = function () {
  try { renderFeed(); } catch (e) {}
  try { renderChatList(); } catch (e) {}
  try {
    const activeTab = document.querySelector('.profile-post-tab.active');
    renderProfileGrid(activeTab && activeTab.textContent.includes('סטוק') ? 'stock' : 'pagia');
  } catch (e) {}
  try { renderExpirySoon(); } catch (e) {}
  try { renderDealsWidget(); } catch (e) {}
  try { renderCategoryCounts(); } catch (e) {}
  try { renderSidebarStats(); } catch (e) {}
  try { renderLeaderboard(); } catch (e) {}
  try { renderNotificationsPanel(); } catch (e) {}
  const savedPage = document.getElementById('page-saved');
  if (savedPage && savedPage.classList.contains('active')) { try { renderSaved('all'); } catch (e) {} }
};
