// api/sora.js

const src = scrape("ai/sora"); // -> Lib/Scrape_file/ai/sora.js

let handler = async (res, req) => {
  try {
    const q = req.query || {};
    const prompt = q.prompt || q.text || q.q;
    const ratio = q.ratio || 'portrait';

    if (!prompt) {
      return res.reply({
        success: false,
        message:
          'Query "prompt" wajib diisi. Contoh: /api/sora?prompt=a+woman+relaxing+on+the+beach'
      });
    }

    const data = await src(prompt, ratio);

    // data sudah dalam bentuk { success, status, videoUrl, ... }
    return res.reply(data);
  } catch (e) {
    return res.reply(
      {
        success: false,
        message: e?.message || String(e)
      },
      { code: 500 }
    );
  }
};

handler.alias = "Sora Text-to-Video";
handler.category = "AI";
handler.params = {
  prompt: {
    desc: "Deskripsi / prompt video",
    example: "a woman relaxing on the beach, cinematic, 4k"
  },
  ratio: {
    desc: 'Rasio video: "portrait" atau "landscape"',
    example: "portrait"
  }
};

module.exports = handler;