
const src = require('../../lib/scrape_file/downloader/ytmp3');

let handler = async (res, req) => {
  try {
    const { url, format = 'mp3' } = req.query || {};
    const { ytUrl, f } = req.body || {};

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

    // Use provided format, default to 'mp3'
    const formatToUse = format || f || 'mp3';

    // Validate format
    if (!['mp3', 'mp4'].includes(formatToUse.toLowerCase())) {
      return res.reply(
        {
          success: false,
          message: 'Invalid format. Use "mp3" for audio or "mp4" for video.',
        },
        { code: 400 }
      );
    }

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

handler.alias = 'YouTube Downloader (YTMP3.CX)';
handler.category = 'Downloader';
handler.method = 'GET'; // Support both GET and POST
handler.params = {
  url: {
    desc: 'YouTube video URL (for GET requests). Supports regular YouTube, Shorts, and Music',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    required: false,
    type: 'string'
  },
  format: {
    desc: 'Output format: mp3 (audio) or mp4 (video). Default: mp3',
    example: 'mp4',
    required: false,
    type: 'string',
    options: ['mp3', 'mp4']
  }
};

// Also support POST requests
handler.body = {
  ytUrl: {
    desc: 'YouTube video URL (for POST requests). Supports regular YouTube, Shorts, and Music',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    required: true,
    type: 'string'
  },
  f: {
    desc: 'Output format: mp3 (audio) or mp4 (video). Default: mp3',
    example: 'mp4',
    required: false,
    type: 'string',
    options: ['mp3', 'mp4']
  }
};

module.exports = handler;
