// lib/scrape_file/anime/jjanime.js
const axios = require('axios');

async function randomJJAnime() {
  try {
    const query = 'jedag jedug anime';

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
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 20000,
    });

    if (!data?.data?.videos?.length) throw new Error('Tidak ada hasil dari TikTok.');

    // Ambil random 1–3 video
    const shuffled = data.data.videos.sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(3, shuffled.length));

    return picked.map(v => ({
      title: v.title || 'Jedag Jedug Anime',
      cover: 'https://tikwm.com' + v.cover,
      url: 'https://tikwm.com' + v.play,
      author: {
        name: v.author.nickname,
        username: '@' + v.author.unique_id
      },
      stats: {
        like: v.digg_count,
        comment: v.comment_count,
        share: v.share_count
      }
    }));
  } catch (e) {
    throw new Error('Gagal mengambil video JJ Anime: ' + e.message);
  }
}

module.exports = { randomJJAnime };