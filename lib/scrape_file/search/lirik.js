const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';
const H  = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9,id;q=0.8' };

const toStr = v => (v == null ? '' : String(v));

async function fetchViaReader(targetUrl) {
  // pakai Jina Reader untuk ambil plaintext
  const u = `https://r.jina.ai/http://${targetUrl.replace(/^https?:\/\//i, '')}`;
  const res = await axios.get(u, { headers: H, timeout: 20000, validateStatus: s => s >= 200 && s < 400 });
  return toStr(res.data || '');
}

/* ==== SEARCHERS ==== */
async function searchByGeniusAPI(q) {
  try {
    const url = `https://genius.com/api/search/multi?per_page=5&q=${encodeURIComponent(q)}`;
    const res = await axios.get(url, { headers: H, timeout: 15000, validateStatus: s => s >= 200 && s < 400 });
    const sections = res.data?.response?.sections || [];
    for (const sec of sections) {
      if (sec.type === 'song') {
        const hits = sec.hits || [];
        const url = hits[0]?.result?.url;
        if (url) return url;
      }
    }
  } catch (_) {}
  return null;
}

async function searchByLyricsCom(q) {
  try {
    const url = `https://www.lyrics.com/lyrics/${encodeURIComponent(q)}`;
    const html = await fetchViaReader(url);
    const $ = cheerio.load(html);
    let link =
      $('div.sec-lyric div.clearfix h3 a').first().attr('href') ||
      $('div.lyrics-list a').first().attr('href');
    if (!link) return null;
    return `https://www.lyrics.com${link}`;
  } catch (_) {
    return null;
  }
}

async function searchBySongSearch(q) {
  try {
    const url = `https://songsear.ch/q/${encodeURIComponent(q)}`;
    const html = await fetchViaReader(url);
    const $ = cheerio.load(html);
    // Link hasil individual biasanya /song/<id>/<slug>
    let href = $('a[href^="/song/"]').first().attr('href');
    if (!href) return null;
    return `https://songsear.ch${href}`;
  } catch (_) {
    return null;
  }
}

/* ==== EXTRACTORS ==== */
function cleanLyricsText(txt) {
  let t = txt.replace(/\r/g, '').split('\n').map(s => s.trimEnd()).join('\n');
  t = t.split('\n').filter(line => line.length < 400).join('\n');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

function extractFromGenius(plain) {
  // ambil bagian setelah kata "Lyrics"
  let section = plain;
  const idx = plain.indexOf('Lyrics');
  if (idx > -1) section = plain.slice(idx + 'Lyrics'.length);

  const stops = ['Embed', 'You might also like', 'More on Genius'];
  for (const s of stops) {
    const i = section.indexOf(s);
    if (i > 80) { section = section.slice(0, i); break; }
  }
  return cleanLyricsText(section);
}

function extractGeneric(plain) {
  const chunks = plain.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
  let best = '';
  for (const c of chunks) {
    const sc = c.split('\n').filter(l => l && l.length <= 120).length;
    if (sc > best.split('\n').length) best = c;
  }
  return cleanLyricsText(best || plain);
}

/* ==== MAIN ==== */
async function lirik(query) {
  try {
    const q = toStr(query).trim();
    if (!q) return { success: false, message: 'Parameter kosong.' };

    let target = null;
    let lastErr = null;

    // 1) Genius API
    try { target = await searchByGeniusAPI(q); } catch (e) { lastErr = e; }
    // 2) Lyrics.com
    if (!target) try { target = await searchByLyricsCom(q); } catch (e) { lastErr = e; }
    // 3) Songsear.ch
    if (!target) try { target = await searchBySongSearch(q); } catch (e) { lastErr = e; }

    if (!target) {
      return { success: false, message: toStr(lastErr?.message || 'Tidak ada hasil dari penyedia lirik.') };
    }

    // Ambil plaintext via reader
    let plain = '';
    try { plain = await fetchViaReader(target); } catch (e) { return { success: false, provider: new URL(target).hostname, message: toStr(e?.message || e) }; }
    if (!plain) return { success: false, provider: new URL(target).hostname, message: 'Gagal memuat halaman.' };

    // Ekstraksi
    const host = new URL(target).hostname;
    let lyrics = host.includes('genius.com') ? extractFromGenius(plain) : extractGeneric(plain);
    lyrics = cleanLyricsText(lyrics);

    if (!lyrics || lyrics.split('\n').length < 3) {
      return { success: false, provider: host, message: 'Lirik tidak berhasil diekstrak.' };
    }

    // Title/artist sederhana
    let title = q, artist = '';
    if (host.includes('genius.com')) {
      const m = target.match(/genius\.com\/([^/]+)-([^/]+)-lyrics/i);
      if (m) { artist = decodeURIComponent(m[1]).replace(/-/g, ' '); title = decodeURIComponent(m[2]).replace(/-/g, ' '); }
    }

    return {
      success: true,
      provider: host,
      query: q,
      title,
      artist,
      link: target,
      thumbnail: '',
      lyrics
    };
  } catch (e) {
    return { success: false, message: toStr(e?.message || e) };
  }
}

module.exports = lirik;
