// ai/upscaler.js
const axios = require('axios');
const FormData = require('form-data');

async function postCode(buffer, scaleRadio = 2) {
  const form = new FormData();
  form.append('myfile', buffer, {
    filename: `image-${Date.now()}.png`,
    contentType: 'image/png' // biarin generic
  });
  form.append('scaleRadio', scaleRadio);

  const headers = {
    ...form.getHeaders(),
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://imgupscaler.com'
  };

  const { data } = await axios.post(
    'https://get1.imglarger.com/api/UpscalerNew/UploadNew',
    form,
    { headers }
  );

  if (!data?.data?.code) {
    throw new Error(
      'Gagal mendapatkan code dari Upscaler: ' +
        (data?.message || JSON.stringify(data))
    );
  }

  return data.data.code;
}

async function checkStatus(code, scaleRadio = 2) {
  const params = { code, scaleRadio };
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://imgupscaler.com/'
  };

  const { data } = await axios.post(
    'https://get1.imglarger.com/api/UpscalerNew/CheckStatusNew',
    params,
    { headers }
  );

  return data?.data || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upscale gambar dari buffer
 * @param {Buffer} buffer - buffer image
 * @param {Object} options
 * @param {number} [options.scaleRadio=2] - faktor scale (2, 4, dll, sesuai support API)
 * @param {number} [options.maxTry=10] - berapa kali polling
 * @param {number} [options.intervalMs=3000] - jeda antar polling (ms)
 */
async function Upscaler(buffer, options = {}) {
  const {
    scaleRadio = 2,
    maxTry = 10,
    intervalMs = 3000
  } = options;

  const code = await postCode(buffer, scaleRadio);

  let result = null;
  for (let i = 0; i < maxTry; i++) {
    result = await checkStatus(code, scaleRadio);
    if (result?.status === 'success') break;
    await delay(intervalMs);
  }

  if (!result) {
    throw new Error('Tidak mendapatkan respon status dari Upscaler.');
  }

  return {
    status: result.status || 'unknown',
    success: result.status === 'success',
    result: {
      downloadUrl: result.downloadUrls?.[0] || null,
      fileSize: result.filesize || null,
      mimeType: result.imagemimetype || null,
      filename: result.originalfilename || null
    }
  };
}

// default export: dipanggil via scrape('ai/upscaler')
module.exports = async (buffer, options = {}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer gambar tidak valid.');
  }
  return Upscaler(buffer, options);
};