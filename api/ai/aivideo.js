const src = scrape("ai/aivideo");

let handler = async (res, req) => {
  try {
    const q = req.query || {};
    const prompt = q.prompt;
    const model = q.model || 'veo-3-fast';
    const auto_sound = q.auto_sound === 'true' || q.auto_sound === true;
    const auto_speech = q.auto_speech === 'true' || q.auto_speech === true;

    if (!prompt) {
      return res.reply(
        {
          success: false,
          message: 'Parameter "prompt" wajib diisi',
        },
        { code: 400 }
      );
    }

    const result = await src({
      prompt,
      model,
      auto_sound,
      auto_speech,
    });

    return res.reply({
      success: true,
      owner: '@IsanAndres',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return res.reply(
      {
        success: false,
        message: e.message || String(e),
      },
      { code: 500 }
    );
  }
};

handler.alias = 'VEO 3 AI Video Generator';
handler.category = 'AI';
handler.params = {
  prompt: {
    desc: 'Prompt deskripsi video',
    example: 'a woman relaxing on the beach',
  },
  model: {
    desc: 'veo-3-fast atau veo-3',
    example: 'veo-3-fast',
  },
  auto_sound: {
    desc: 'true / false',
    example: 'false',
  },
  auto_speech: {
    desc: 'true / false',
    example: 'false',
  },
};

module.exports = handler;