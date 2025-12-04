// api/ai/ChatAi-unli.js

const src = scrape("ai/Ai-chat-unlimited");

let handler = async (res, req) => {
  try {
    const q = req.query || {};
    const question = q.q || q.text || q.msg || q.prompt;

    if (!question) {
      return res.reply({
        success: false,
        message:
          'Query "q" wajib diisi. Contoh: /api/ai/ChatAi-unli?q=Halo apa kabar?'
      });
    }

    const data = await src(question);

    if (!data || data.success === false) {
      return res.reply({
        success: false,
        message: data?.message || "Gagal mengambil jawaban dari UnlimitedAI"
      });
    }

    return res.reply({
      success: true,
      owner: "@IsanAndres",
      result: {
        question,
        answer: data.answer
      },
      timestamp: new Date().toISOString()
    });
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

handler.alias = "Chat AI Unlimited";
handler.category = "AI";
handler.params = {
  q: {
    desc: "Pertanyaan untuk UnlimitedAI",
    example: "Halo, jelaskan teori relativitas."
  }
};

module.exports = handler;