// api/anime/jjanime.js
const src = require('../../lib/scrape_file/anime/jjanime');

let handler = async (res, req) => {
  try {
    const result = await src.randomJJAnime();
    res.reply({
      success: true,
      keyword: 'jedag jedug anime',
      count: result.length,
      result
    });
  } catch (error) {
    res.reply({ success: false, error: error.message }, { code: 500 });
  }
};

handler.alias = 'JJ Anime Random';
handler.category = 'Anime';
handler.params = {}; // tidak butuh input

module.exports = handler;