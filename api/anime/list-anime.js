// api/anime/anime.js
const scrape = require('../../lib/scrape');
const src = scrape('anime/Anime');

let handler = async (res, req) => {
  try {
    const { query } = req;
    const q = query.text || 'one piece';

    const data = await src(q);

    if (!data.success) {
      return res.reply({ success: false, error: data.message }, { code: 404 });
    }

    res.reply({
      success: true,
      result: data.result.map(a => ({
        title: a.title,
        type: a.type,
        episode: a.episode,
        score: a.score,
        url: a.url,
        thumbnail: a.thumbnail
      })),
    });
  } catch (error) {
    res.reply({ success: false, error: error.message }, { code: 500 });
  }
};

handler.alias = 'MyAnimeList Search';
handler.category = 'Anime';
handler.params = {
  text: { desc: 'Judul anime untuk dicari', example: 'One Piece' },
};

module.exports = handler;