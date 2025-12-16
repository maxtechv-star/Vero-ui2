const axios = require('axios');

async function igee_deel(url) {
  try {
    const endpoint = 'https://igram.website/content.php?url=' + encodeURIComponent(url);

    const { data } = await axios.post(endpoint, '', {
      headers: {
        authority: 'igram.website',
        accept: '*/*',
        'accept-language': 'id-ID,id;q=0.9',
        'content-type': 'application/x-www-form-urlencoded',
        cookie: '',
        referer: 'https://igram.website/',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
      }
    });

    return data;
  } catch (e) {
    return { error: e.message };
  }
}

function parse(html) {
  const clean = html.replace(/\n|\t/g, '');

  const videoMatch = [...clean.matchAll(/<source src="([^"]+)/g)].map(x => x[1]);
  let imageMatch = [...clean.matchAll(/<img src="([^"]+)/g)].map(x => x[1]);

  if (imageMatch.length > 0) imageMatch = imageMatch.slice(1);

  const captionRaw = clean.match(/<p class="text-sm"[^>]*>(.*?)<\/p>/);
  const caption = captionRaw ? captionRaw[1].replace(/<br ?\/?>/g, '\n') : '';

  const likes = clean.match(/far fa-heart"[^>]*><\/i>\s*([^<]+)/);
  const comments = clean.match(/far fa-comment"[^>]*><\/i>\s*([^<]+)/);
  const time = clean.match(/far fa-clock"[^>]*><\/i>\s*([^<]+)/);

  return {
    is_video: videoMatch.length > 0,
    videos: videoMatch,
    images: imageMatch,
    caption,
    likes: likes ? likes[1] : null,
    comments: comments ? comments[1] : null,
    time: time ? time[1] : null
  };
}

async function instagram(url) {
  const raw = await igee_deel(url);
  if (!raw || !raw.html) return { error: 'scrape_failed' };

  const parsed = parse(raw.html);

  return {
    status: raw.status,
    username: raw.username,
    type: parsed.is_video ? 'video' : 'image',
    video_url: parsed.is_video && parsed.videos.length > 0 ? parsed.videos[0] : null,
    images: parsed.is_video ? [] : parsed.images,
    caption: parsed.caption,
    likes: parsed.likes,
    comments: parsed.comments,
    time: parsed.time
  };
}

let handler = async (res, req) => {
  try {
    const { url } = req.query;
    
    // Validate URL
    if (!url) {
      return res.reply('URL parameter is required.', { code: 400 });
    }
    
    // Validate Instagram URL pattern
    const instagramPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[a-zA-Z0-9_-]+\/?/i;
    if (!instagramPattern.test(url)) {
      return res.reply('Invalid Instagram URL. Supported: posts, reels, IGTV, stories.', { code: 400 });
    }
    
    // Process Instagram download
    const result = await instagram(url);
    
    // Handle errors from the scraper
    if (result.error) {
      return res.reply({
        success: false,
        error: result.error,
        message: 'Failed to fetch Instagram content'
      }, { code: 500 });
    }
    
    // Check if we got any content
    if (!result.video_url && (!result.images || result.images.length === 0)) {
      return res.reply({
        success: false,
        error: 'no_content',
        message: 'No media found in this Instagram post'
      }, { code: 404 });
    }
    
    // Prepare response based on content type
    const response = {
      success: true,
      username: result.username || 'Unknown',
      type: result.type,
      caption: result.caption || '',
      likes: result.likes || '0',
      comments: result.comments || '0',
      posted: result.time || 'Unknown',
      metadata: {
        status: result.status || 'unknown',
        source_url: url
      }
    };
    
    // Add media URLs
    if (result.type === 'video') {
      response.video_url = result.video_url;
      response.thumbnail = result.images && result.images.length > 0 ? result.images[0] : null;
    } else if (result.type === 'image') {
      response.images = result.images;
      if (result.images && result.images.length === 1) {
        response.image_url = result.images[0]; // Single image for convenience
      }
    }
    
    return res.reply(response);
    
  } catch (error) {
    console.error('Instagram API Error:', error);
    return res.reply({
      success: false,
      error: 'internal_error',
      message: error.message || 'An error occurred while processing the request'
    }, { code: 500 });
  }
};

handler.alias = 'Instagram Downloader';
handler.category = 'Downloader';
handler.method = 'GET';
handler.status = 'ready';
handler.params = {
  url: { 
    desc: 'Instagram post URL (post, reel, IGTV, or story)', 
    required: true,
    type: 'string',
    example: 'https://www.instagram.com/p/Cxxxxxxxxxx/'
  }
};

handler.notes = [
  'Supports Instagram posts, reels, IGTV, and stories',
  'Downloads both images and videos',
  'Returns media URLs, caption, likes, and comments count',
  'For carousel posts, returns multiple image URLs',
  'Stories may have limited availability (24-hour expiration)',
  'Rate limiting may apply from the source service'
];

module.exports = handler;
