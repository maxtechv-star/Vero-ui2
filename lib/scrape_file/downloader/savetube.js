// ai/ytDownloader.js
const axios = require('axios');

const DEFAULTS = {
  mp4Quality: '720', // default otomatis untuk video
  // mp3 tidak pakai quality di API kamu (format=mp3)
};

function normalizeType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'audio') return 'mp3';
  if (t === 'video') return 'mp4';
  return t || 'mp4';
}

function pickQuality({ type, quality }) {
  // mp3: quality tidak relevan
  if (type === 'mp3') return null;

  const allowedQuality = ['360', '720', '1080'];

  // kalau tidak diisi / kosong / "auto" => pakai default
  const q = quality == null ? 'auto' : String(quality).toLowerCase();
  if (q === 'auto' || q === '') return DEFAULTS.mp4Quality;

  // kalau diisi tapi tidak valid => fallback ke default
  if (!allowedQuality.includes(q)) return DEFAULTS.mp4Quality;

  return q;
}

async function ytDownloader(url, type = 'mp4', quality) {
  if (!url || !String(url).includes('youtu')) {
    return { success: false, message: 'URL YouTube tidak valid atau tidak diberikan.' };
  }

  const t = normalizeType(type);
  const allowedType = ['mp4', 'mp3'];
  if (!allowedType.includes(t)) {
    return { success: false, message: 'Tipe hanya boleh: mp4 atau mp3.' };
  }

  const q = pickQuality({ type: t, quality });

  try {
    const params = new URLSearchParams({
      url,
      // mp3: format=mp3
      // mp4: format=360/720/1080
      format: t === 'mp3' ? 'mp3' : q,
    });

    const { data } = await axios.get(
      'https://api.ootaizumi.web.id/downloader/youtube?' + params.toString(),
      { timeout: 20000 }
    );

    const yt = data?.result || data?.data || data;

    if (!yt || typeof yt !== 'object') {
      return { success: false, message: 'Response API tidak valid.', raw: data };
    }

    const meta = {
      title: yt.title || yt.video_title || yt.videoTitle || yt.metadata?.title || null,
      author:
        yt.author?.channelTitle ||
        yt.channel ||
        yt.channelTitle ||
        yt.uploader ||
        null,
      uploaded:
        yt.metadata?.jadwal_upload ||
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
      type: t,
      // mp3 tidak ada quality
      quality: t === 'mp3' ? null : q,
      meta,
      download: downloadUrl,
      resultOriginal: yt,
    };
  } catch (e) {
    return { success: false, message: e?.message || String(e) };
  }
}

module.exports = async (url, type = 'mp4', quality) => {
  return ytDownloader(url, type, quality);
};
