// api/ai/blackbox.js
// Blackbox Chat Completions (drop-in, dengan debug & error mapping)

// ================== KONFIGURASI CEPAT ==================
// 1) Paling aman: set di ENV -> BLACKBOX_API_KEY=sk-xxxxxx
// 2) Atau taruh langsung di bawah ini (jangan commit ke repo publik!)
const FILE_API_KEY = 'sk-4kO-IRFmyyO_-P0uD2Tf4w'; // <-- GANTI kalau tidak pakai ENV
const DEFAULT_MODEL = 'openai/gpt-4o';
const ENDPOINT = 'https://api.blackbox.ai/chat/completions';
// =======================================================

const axios = require('axios');

function getApiKey() {
  // Prioritas ENV, lalu fallback konstanta file
  return process.env.BLACKBOX_API_KEY || FILE_API_KEY;
}
function redactKey(k = '') {
  if (!k || typeof k !== 'string') return '(empty)';
  if (k.length <= 10) return k; // pendek, tidak di-redact
  return `${k.slice(0, 6)}…${k.slice(-4)}`; // tampilkan sebagian untuk debug aman
}
function validKeyFormat(k = '') {
  // Blackbox biasanya 'sk-' (kadang 'sk_'): izinkan keduanya
  return /^sk[-_]/i.test(k);
}

async function callBlackbox({ apiKey, prompt, model = DEFAULT_MODEL, stream = false }) {
  return axios.post(
    ENDPOINT,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      stream
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 20000,
      // biar kita bisa mapping error status sendiri
      validateStatus: () => true
    }
  );
}

let handler = async (res, req) => {
  try {
    const q = String(req?.query?.text || '').trim();
    const debug = String(req?.query?.debug || '').trim() === '1';

    if (!q) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: "Parameter `text` wajib diisi. Contoh: ?text=Halo, siapa kamu?"
        }),
        { code: 400 }
      );
    }

    const apiKey = getApiKey();

    // Debug aman (redact)
    console.log('[Blackbox] Using key:', redactKey(apiKey));

    if (!apiKey || apiKey === 'sk-CHANGE_ME') {
      return res.reply(
        JSON.stringify({
          success: false,
          error:
            'API key belum diisi. Set BLACKBOX_API_KEY di ENV atau isi konstanta FILE_API_KEY (format sk-...) pada api/ai/blackbox.js'
        }),
        { code: 401 }
      );
    }
    if (!validKeyFormat(apiKey)) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: 'Format API key salah. Harus diawali `sk-` atau `sk_` (Server Key, bukan bb_).',
          tip: 'Buat "Server Key" di https://cloud.blackbox.ai → API Keys'
        }),
        { code: 401 }
      );
    }

    const r = await callBlackbox({ apiKey, prompt: q });

    // Sukses
    if (r.status >= 200 && r.status < 300) {
      const content =
        r.data?.choices?.[0]?.message?.content ||
        r.data?.message ||
        r.data?.result ||
        '';

      if (!content) {
        return res.reply(
          JSON.stringify({
            success: false,
            error: 'Respon kosong dari Blackbox.',
            ...(debug ? { providerRaw: r.data } : {})
          }),
          { code: 502 }
        );
      }

      return res.reply({
  success: true,
  provider: 'blackbox.ai',
  model: DEFAULT_MODEL,
  query: q,
  result: content
});
    // Gagal → mapping error
    const status = r.status || 500;
    const body = r.data || null;

    if (status === 401) {
      return res.reply(
        JSON.stringify({
          success: false,
          error:
            '401 Unauthorized — API key salah/invalid atau tidak dikirim. Pastikan pakai Server Key (sk-...)',
          ...(debug ? { providerRaw: body } : {})
        }),
        { code: 401 }
      );
    }
    if (status === 402) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: '402 Payment Required — saldo/hak akses tidak cukup.',
          ...(debug ? { providerRaw: body } : {})
        }),
        { code: 402 }
      );
    }
    if (status === 429) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: '429 Rate limit — coba lagi beberapa saat.',
          ...(debug ? { providerRaw: body } : {})
        }),
        { code: 429 }
      );
    }
    if (status >= 500) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: `Server provider error (${status}).`,
          ...(debug ? { providerRaw: body } : {})
        }),
        { code: status }
      );
    }

    // Lain-lain (4xx selain di atas)
    return res.reply(
      JSON.stringify({
        success: false,
        error: `Request gagal (${status}).`,
        ...(debug ? { providerRaw: body } : {})
      }),
      { code: status }
    );
  } catch (e) {
    const status = e?.response?.status || 500;
    const detail = e?.response?.data || e.message || String(e);
    return res.reply(
      JSON.stringify({
        success: false,
        error: 'Gagal memanggil Blackbox.',
        detail
      }),
      { code: status }
    );
  }
};

handler.alias = 'Blackbox Chat';
handler.category = 'AI';
handler.params = {
  text: { desc: 'Prompt/pertanyaan untuk AI', example: 'Jelaskan event loop di Node.js' }
};

module.exports = handler;