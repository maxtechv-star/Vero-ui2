const src = scrape("search/lirik");

let handler = async (res, req) => {
    try {
        const q = req.query.q || req.query.title;

        if (!q) {
            return res.reply({
                success: false,
                message: 'Parameter "q" atau "title" wajib diisi'
            });
        }

        const result = await src(q);

        return res.reply({
            success: true,
            owner: "@VeronDev",
            result,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.reply(
            { success: false, message: e.message || String(e) },
            { code: 500 }
        );
    }
};

handler.alias = "Lyrics Search";
handler.category = "Search";
handler.params = {
    q: {
        desc: "Judul lagu atau kata kunci pencarian",
        example: "bunga maaf"
    }
};

module.exports = handler;