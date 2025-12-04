const axios = require('axios');

async function getFastFluxImageBuffer(text) {
  if (!text) throw new Error('text is required.');

  const url = 'https://fast-flux-demo.replicate.workers.dev/api/generate-image';

  const response = await axios.get(url, {
    params: { text },
    responseType: 'arraybuffer', // ⬅️ langsung ambil buffer image
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.34 Mobile Safari/537.36'
    }
  });

  return {
    buffer: Buffer.from(response.data),
    mime: response.headers['content-type'] || 'image/webp'
  };
}

module.exports = { getFastFluxImageBuffer };