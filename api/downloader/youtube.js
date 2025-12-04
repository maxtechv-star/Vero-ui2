const src = require('../../lib/scrape_file/downloader/savetube');

let handler = async (res, req) => {
  try {
    const { url, type = 'mp4', quality = '360' } = req.query || {};

    if (!url) {
      return res.reply(
        {
          success: false,
          message: 'Param "url" (link YouTube) wajib diisi.',
        },
        { code: 400 }
      );
    }

    const data = await src(url, type, quality); // panggil scraper

    // Selalu balikin JSON rapi
    return res.reply(data, { code: data.success ? 200 : 500 });
  } catch (e) {
    return res.reply(
      {
        success: false,
        message: e?.message || String(e),
      },
      { code: 500 }
    );
  }
};

handler.alias = 'YouTube Downloader';
handler.category = 'Downloader';
handler.params = {
  url: {
    desc: 'URL video YouTube',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  type: {
    desc: 'Jenis output: mp4 | mp3 (default mp4)',
    example: 'mp4',
  },
  quality: {
    desc: 'Quality untuk mp4: 360 / 720 / 1080 (default 360)',
    example: '720',
  },
};

module.exports = handler;
