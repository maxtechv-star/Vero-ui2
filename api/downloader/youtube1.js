const src = require('../../lib/scrape_file/downloader/ogmp3');

let handler = async (res, req) => {
  try {
    const { url, format = '128k' } = req.query || {};
    const { ytUrl, quality } = req.body || {};

    // Check if URL is provided
    const ytUrlToUse = url || ytUrl;
    
    if (!ytUrlToUse) {
      return res.reply(
        {
          success: false,
          message: 'YouTube URL is required. Provide either "url" query parameter or "ytUrl" in body.',
        },
        { code: 400 }
      );
    }

    // Use provided format or quality, default to '128k'
    const formatToUse = format || quality || '128k';

    const data = await src(ytUrlToUse, formatToUse);

    // Return appropriate response
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

handler.alias = 'YouTube Downloader (OGMP3)';
handler.category = 'Downloader';
handler.method = 'GET'; // Support both GET and POST
handler.params = {
  url: {
    desc: 'YouTube video URL (for GET requests)',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    required: false,
    type: 'string'
  },
  format: {
    desc: 'Output format/quality. Available: 64k, 96k, 128k, 192k, 256k, 320k, 240p, 360p, 480p, 720p, 1080p (default: 128k)',
    example: '720p',
    required: false,
    type: 'string'
  }
};

// Also support POST requests
handler.body = {
  ytUrl: {
    desc: 'YouTube video URL (for POST requests)',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    required: true,
    type: 'string'
  },
  quality: {
    desc: 'Output format/quality. Available: 64k, 96k, 128k, 192k, 256k, 320k, 240p, 360p, 480p, 720p, 1080p (default: 128k)',
    example: '720p',
    required: false,
    type: 'string'
  }
};

module.exports = handler;