const axios = require('axios');
const FormData = require('form-data');

async function remini(imageBuf, mode = 'enhance') {
  const MODES = new Set(['enhance','recolor','dehaze']);
  const picked = MODES.has(String(mode)) ? String(mode) : 'enhance';

  if (!imageBuf || !(imageBuf instanceof Buffer || imageBuf?.buffer))
    throw new Error('imageBuf harus Buffer.');

  const url = `https://inferenceengine.vyro.ai/${picked}`;
  const form = new FormData();
  form.append('image', Buffer.from(imageBuf), {
    filename: 'input.jpg',
    contentType: 'image/jpeg',
  });

  try {
    const { data } = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'okhttp/4.9.3',
        Connection: 'Keep-Alive',
        'Accept-Encoding': 'gzip',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 2,
      validateStatus: s => s >= 200 && s < 400,
    });
    return Buffer.from(data);
  } catch (err) {
    // lempar error yang informatif
    if (err.response) {
      const snippet = Buffer.isBuffer(err.response.data)
        ? err.response.data.toString('utf8').slice(0,300)
        : JSON.stringify(err.response.data)?.slice(0,300);
      throw new Error(`Vyro ${picked} HTTP ${err.response.status}: ${snippet || 'no-body'}`);
    }
    throw new Error(`Vyro ${picked} gagal: ${err.message || String(err)}`);
  }
}

module.exports = remini;
