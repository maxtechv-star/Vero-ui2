// api/fbdl.js
const src = scrape("downloader/fbdl");

let handler = async (res, req) => {
  try {
    const q = req.query || {};
    // support beberapa nama param biar fleksibel
    const url = q.url || q.link || q.u;

    if (!url) {
      //  ✅ selalu 200, tapi success:false
      return res.reply({
        success: false,
        message: 'Query "url" wajib diisi. Contoh: /api/fbdl?url=https://www.facebook.com/...'
      });
    }

    const data = await src(url);

    // data sudah dalam bentuk { success, hd, sd, message, source }
    return res.reply(data); // tidak set code -> default 200
  } catch (e) {
    // ini baru 500 beneran (error server)
    return res.reply(
      {
        success: false,
        message: e?.message || String(e)
      },
      { code: 500 }
    );
  }
};

handler.alias = "Facebook Downloader";
handler.category = "Downloader";
handler.params = {
  url: {
    desc: "Link video Facebook / Reels",
    example: "https://www.facebook.com/share/v/1aF74GAacy/"
  }
};

module.exports = handler;