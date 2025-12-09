
const src = require('../../lib/scrape_file/downloader/y2mate');

let handler = async (res, req) => {
  try {
    const { url, format = 'mp3' } = req.query || {};
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

    // Validate YouTube URL
    if (!ytUrlToUse.includes('youtube.com') && !ytUrlToUse.includes('youtu.be')) {
      return res.reply(
        {
          success: false,
          message: 'Invalid YouTube URL. Must be from youtube.com or youtu.be',
        },
        { code: 400 }
      );
    }

    // Use provided format or quality, default to 'mp3'
    // Convert quality to format if needed
    let formatToUse = format;
    if (quality) {
      // If quality is like '720p', use mp4 format
      if (quality.includes('p')) {
        formatToUse = 'mp4';
      } else if (quality.includes('k')) {
        formatToUse = 'mp3';
      }
    }

    // Validate format
    if (formatToUse !== 'mp3' && formatToUse !== 'mp4') {
      return res.reply(
        {
          success: false,
          message: 'Format must be either "mp3" or "mp4"',
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

handler.alias = 'YouTube Downloader (Y2Mate)';
handler.category = 'Downloader';
handler.method = 'GET'; // Support both GET and POST
handler.params = {
  url: {
    desc: 'YouTube video URL (for GET requests). Supports: youtube.com, youtu.be, YouTube Shorts',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    required: false,
    type: 'string'
  },
  format: {
    desc: 'Output format: mp3 (audio) or mp4 (video)',
    example: 'mp4',
    options: ['mp3', 'mp4'],
    required: false,
    type: 'string'
  }
};

// Also support POST requests
handler.body = {
  ytUrl: {
    desc: 'YouTube video URL (for POST requests). Supports: youtube.com, youtu.be, YouTube Shorts',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    required: true,
    type: 'string'
  },
  quality: {
    desc: 'Output quality hint: use mp3 for audio, mp4 for video (format parameter takes priority)',
    example: 'mp4',
    required: false,
    type: 'string'
  }
};

module.exports = handler;
