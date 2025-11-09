// lib/scrape_file/anime/samehadaku_covers.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://samehadaku.email';

async function getNonce() {
  const { data } = await axios.get(BASE, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  const raw = $('#live_search-js-extra').html() || '';
  const nonce = raw.match(/"nonce":"([^"]+)"/)?.[1] || null;
  return nonce;
}

function toAbs(u) {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return BASE.replace(/\/+$/,'') + '/' + String(u).replace(/^\/+/,'');
}

// Fallback: scrape halaman hasil pencarian HTML (?s=)
async function fallbackSearchHTML(q) {
  const url = `${BASE}/?s=${encodeURIComponent(q)}`;
  const { data } = await axios.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  const out = [];
  // Card umum di theme Samehadaku (bisa sedikit bervariasi)
  $('.post-show li, .post-show .post, article, .animposx').each((_, el) => {
    const a = $(el).find('a').first();
    const img =
      $(el).find('img').attr('data-src') ||
      $(el).find('img').attr('src') ||
      null;
    const title =
      a.attr('title') ||
      $(el).find('.entry-title').text().trim() ||
      a.text().trim();
    const href = a.attr('href');
    if (href && title) {
      out.push({
        title: title.trim(),
        image: toAbs(img),
        url: toAbs(href),
      });
    }
  });
  // unik + bersih
  const seen = new Set();
  return out.filter(x => {
    const k = (x.url || '') + '|' + (x.image || '');
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

async function search(query) {
  if (!query || !query.trim()) throw new Error('Missing query');
  // 1) coba via API (lebih akurat & cepat)
  try {
    const nonce = await getNonce();
    if (nonce) {
      const { data } = await axios.get(
        `${BASE}/wp-json/eastheme/search/?keyword=${encodeURIComponent(query)}&nonce=${nonce}`,
        { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      );
      const items = Object.values(data || {});
      // Hanya map -> { title, image, url }
      const slim = items
        .map(v => ({
          title: (v?.title || '').toString().trim(),
          image: toAbs(v?.img || v?.thumb),
          url: toAbs(v?.url)
        }))
        .filter(x => x.title && x.url);
      if (slim.length) return slim;
    }
  } catch {}
  // 2) fallback scrape HTML
  return await fallbackSearchHTML(query);
}

// === Export: object dengan method "search"
module.exports = search;