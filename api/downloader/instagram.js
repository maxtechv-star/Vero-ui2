const axios = require("axios");

async function instagramDownloadRaw(url) {
  try {
    const res = await axios.post(
      "https://thesocialcat.com/api/instagram-download",
      {
        url: url
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        },
        timeout: 15000
      }
    );

    return res.data;
  } catch (err) {
    return err.response?.data || {
      error: true,
      message: err.message
    };
  }
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
    
    // Process Instagram download using thesocialcat.com API
    const result = await instagramDownloadRaw(url);
    
    // Handle API errors
    if (result.error) {
      return res.reply({
        success: false,
        error: result.error,
        message: result.message || 'Failed to fetch Instagram content'
      }, { code: 500 });
    }
    
    // Handle cases where data might be in result.data or result.result
    const data = result.data || result.result || result;
    
    // Check if we got any content
    if (!data.media && !data.thumbnail && !data.download_url) {
      return res.reply({
        success: false,
        error: 'no_content',
        message: 'No media found in this Instagram post'
      }, { code: 404 });
    }
    
    // Format response based on thesocialcat.com API response structure
    const response = {
      success: true,
      type: data.type || (data.media_type || 'unknown'),
      caption: data.caption || data.description || '',
      username: data.username || data.author || 'Unknown',
      likes: data.likes || data.like_count || '0',
      comments: data.comments || data.comment_count || '0',
      posted: data.upload_date || data.timestamp || 'Unknown',
      thumbnail: data.thumbnail || data.thumb_url || null,
      media_urls: [],
      metadata: {
        source_url: url,
        platform: 'Instagram',
        service: 'thesocialcat.com'
      }
    };
    
    // Extract media URLs based on different response formats
    if (data.download_url) {
      response.media_urls.push(data.download_url);
      if (data.type === 'video') {
        response.video_url = data.download_url;
      } else if (data.type === 'image') {
        response.image_url = data.download_url;
      }
    }
    
    if (data.media && Array.isArray(data.media)) {
      data.media.forEach(media => {
        if (media.url) response.media_urls.push(media.url);
      });
    } else if (data.media && typeof data.media === 'string') {
      response.media_urls.push(data.media);
      response.image_url = data.media;
    }
    
    // Handle multiple media (carousel posts)
    if (data.media_urls && Array.isArray(data.media_urls)) {
      response.media_urls = [...response.media_urls, ...data.media_urls];
    }
    
    // For single media, add convenience properties
    if (response.media_urls.length === 1) {
      if (response.type === 'video') {
        response.video_url = response.media_urls[0];
      } else if (response.type === 'image' || response.type === 'photo') {
        response.image_url = response.media_urls[0];
      }
    }
    
    // Extract dimensions if available
    if (data.dimensions) {
      response.dimensions = data.dimensions;
    } else if (data.width && data.height) {
      response.dimensions = {
        width: data.width,
        height: data.height
      };
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
  'Uses thesocialcat.com API for reliable downloading',
  'Returns media URLs, caption, likes, and comments count',
  'For carousel posts, returns multiple image URLs',
  'Stories may have limited availability (24-hour expiration)',
  'Includes thumbnail preview when available',
  '15-second timeout for API requests'
];

module.exports = handler;
