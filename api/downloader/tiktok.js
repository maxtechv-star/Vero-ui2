const src = scrape('downloader/tiktok');

let handler = async (res, req) => {
    try {
        const { url } = req.query;
        if (!url.includes('tiktok.com')) return res.reply('Invalid url.', { code: 400 });
        
        const result = await src(url);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'TikTok Downloader';
handler.category = 'Downloader';
handler.params = {
    url: { desc: 'Input url from tiktok.', example: 'https://tiktok.com/...' }
};

module.exports = handler;