const src = require('../../lib/scrape_file/downloader/savetube');

let handler = async (res, req) => {
  try {
    const { url } = req.query || {};

    if (!url) {
      return res.reply(
        { success: false, message: 'Param "url" (link YouTube) wajib diisi.' },
        { code: 400 }
      );
    }

    // audio: paksa mp3, quality diabaikan
    const data = await src(url, 'mp3', 'auto');

    if (data?.success) data.quality = null;

    return res.reply(data, { code: data.success ? 200 : 500 });
  } catch (e) {
    return res.reply(
      { success: false, message: e?.message || String(e) },
      { code: 500 }
    );
  }
};

handler.alias = 'YouTube Audio (MP3)';
handler.status = 'ready';
handler.category = 'Downloader';
handler.params = {
  url: {
    desc: 'URL video YouTube',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
};

module.exports = handler;
