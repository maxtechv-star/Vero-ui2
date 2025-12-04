// ai/ytDownloader.js
const axios = require('axios');

async function ytDownloader(url, type = 'mp4', quality = '360') {
  if (!url || !url.includes('youtu')) {
    return {
      success: false,
      message: 'Invalid YouTube URL or not provided.',
    };
  }

  const allowedType = ['mp4', 'mp3'];
  if (!allowedType.includes(type)) {
    return {
      success: false,
      message: 'Type must be: mp4 or mp3.',
    };
  }

  const allowedQuality = ['360', '720', '1080'];
  if (type === 'mp4' && !allowedQuality.includes(quality)) {
    return {
      success: false,
      message: 'Available quality: ' + allowedQuality.join(', '),
    };
  }

  try {
    const params = new URLSearchParams({
      url,
      format: type === 'mp3' ? 'mp3' : quality,
    });

    const { data } = await axios.get(
      'https://api.ootaizumi.web.id/downloader/youtube?' + params.toString(),
      { timeout: 20000 }
    );

    // Get the actual result from API (could be in .result, .data, or root)
    const yt = data?.result || data?.data || data;

    if (!yt || typeof yt !== 'object') {
      return {
        success: false,
        message: 'Invalid API response.',
        raw: data,
      };
    }

    // TRY to guess common fields, but don't force it
    const meta = {
      title:
        yt.title ||
        yt.video_title ||
        yt.videoTitle ||
        yt.metadata?.title ||
        null,
      author:
        yt.author?.channelTitle ||
        yt.channel ||
        yt.channelTitle ||
        yt.uploader ||
        null,
      uploaded:
        yt.metadata?.upload_schedule ||
        yt.published ||
        yt.uploaded ||
        yt.upload_date ||
        null,
      url: yt.url || yt.link || yt.video_url || null,
      thumbnail: yt.thumbnail || yt.thumb || yt.thumbnail_url || null,
      like: yt.metadata?.like || yt.likes || null,
      comment: yt.metadata?.comment || yt.comments || null,
      duration:
        yt.metadata?.duration ||
        yt.duration ||
        yt.length ||
        yt.length_seconds ||
        null,
    };

    const downloadUrl =
      yt.download ||
      yt.download_url ||
      yt.url_download ||
      yt.link_download ||
      null;

    return {
      success: true,
      type,
      quality: type === 'mp3' ? null : quality,
      meta,
      download: downloadUrl,
      // important: return all raw data for verification
      resultOriginal: yt,
    };
  } catch (e) {
    return {
      success: false,
      message: e?.message || String(e),
    };
  }
}

// called via scrape('ai/ytDownloader')
module.exports = async (url, type = 'mp4', quality = '360') => {
  return ytDownloader(url, type, quality);
};