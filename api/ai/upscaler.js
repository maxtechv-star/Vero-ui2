// api/upscaler.js
const src = scrape('ai/upscaler'); // pastikan path sesuai sistem kamu

let handler = async (res, req) => {
  try {
    const { imageUrl, scale } = req.query;

    if (!imageUrl) {
      return res.reply(
        {
          success: false,
          error: 'Parameter imageUrl wajib diisi.'
        },
        { code: 400 }
      );
    }

    // ambil buffer gambar dari URL (sesuai pola sistem-mu)
    // asumsi: res.getBuffer(url, { mime: 'image' }) sudah tersedia
    const buffer = await res.getBuffer(imageUrl, { mime: 'image' });

    // scale optional: ?scale=4; default 2
    const scaleRadio = scale ? Number(scale) || 2 : 2;

    const data = await src(buffer, { scaleRadio });

    return res.reply({
      success: data.success,
      status: data.status,
      result: data.result
    });
  } catch (error) {
    console.error('Upscaler API Error:', error);

    const msg =
      typeof error === 'string'
        ? error
        : error?.message || JSON.stringify(error);

    return res.reply(
      {
        success: false,
        error: msg
      },
      { code: 500 }
    );
  }
};

handler.alias = 'Image Upscaler';
handler.category = 'AI';
handler.params = {
  imageUrl: {
    desc: 'URL gambar yang akan di-upscale (disarankan pakai tmpfiles atau direct image URL)',
    example: 'https://tmpfiles.org/dl/xxxx/image.png'
  },
  scale: {
    desc: 'Faktor perbesaran (opsional, default 2)',
    example: '2'
  }
};

module.exports = handler;