// lib/scrape_file/downloader/tiktok_search.js
const axios = require('axios');

async function tiktokSearch(query) {
  try {
    if (!query || !query.trim()) throw new Error('Masukkan kata kunci pencarian.');

    const payload = {
      keywords: query,
      count: 15,
      cursor: 0,
      web: 1,
      hd: 1
    };

    const { data } = await axios.post('https://tikwm.com/api/feed/search', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 20000
    });

    if (!data?.data?.videos?.length)
      throw new Error('Tidak ada hasil ditemukan dari TikTok.');

    return data.data.videos.map(v => ({
      title: v.title || '(Tanpa Judul)',
      cover: 'https://tikwm.com' + v.cover,
      url: 'https://tikwm.com' + v.play,
      author: {
        name: v.author.nickname,
        username: '@' + v.author.unique_id,
        avatar: v.author.avatar
      },
      stats: {
        like: v.digg_count,
        comment: v.comment_count,
        share: v.share_count,
        play: v.play_count
      },
      music: {
        title: v.music_info.title,
        author: v.music_info.author,
        url: 'https://tikwm.com' + v.music
      }
    }));
  } catch (e) {
    throw new Error('Gagal mencari video TikTok: ' + (e.message || e));
  }
}

module.exports = { tiktokSearch };
