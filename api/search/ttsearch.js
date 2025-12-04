const src = require('../../lib/scrape_file/search/ttsearch');

let handler = async (res, req) => {
  try {
    const { text } = req.query;
    const q = text?.trim() || 'jedag jedug anime'; // default jika kosong
    const result = await src.tiktokSearch(q);

    res.reply({
      success: true,
      keyword: q,
      count: result.length,
      result
    });
  } catch (error) {
    res.reply(
      { success: false, error: error.message },
      { code: 500 }
    );
  }
};

handler.alias = 'TikTok Search';
handler.category = 'Search';
handler.params = {
  text: { desc: 'Kata kunci untuk pencarian video TikTok.', example: 'anime edit jedag jedug' }
};

module.exports = handler;