const src = scrape('ai/unres');

let handler = async (res, req) => {
    try {
        const prompt = req.query.prompt;
        const style = req.query.style || "anime";

        if (!prompt) {
            return res.reply({
                success: false,
                message: 'Parameter "prompt" wajib diisi'
            }, { code: 400 });
        }

        // panggil scraper unrestrictedai(prompt, style)
        const result = await src(prompt, style);

        if (!result.success) {
            return res.reply({
                success: false,
                message: result.message || "Gagal memproses"
            }, { code: 500 });
        }

        return res.reply({
            success: true,
            owner: "@IsanAndres",
            result: {
                prompt: result.prompt,
                style: result.style,
                image: result.image
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.reply({
            success: false,
            message: error.message || String(error)
        }, { code: 500 });
    }
};

handler.alias = "Unrestricted AI Image";
handler.category = "AI";
handler.params = {
    prompt: {
        desc: "Prompt untuk generate gambar",
        example: "girl wearing glasses"
    },
    style: {
        desc: "Style gambar",
        example: "anime"
    }
};

module.exports = handler;