const src = scrape('downloader/aio/v1');

let handler = async (res, req) => {
    try {
        const { url } = req.query;
        if (!url.includes('https://')) return res.reply('Invalid url.', { code: 400 });
        
        const result = await src(url);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'All In One Downloader v1';
handler.category = 'Downloader';
handler.params = {
    url: { desc: 'Input url from all platform.', example: 'https://instagram.com/...' }
};

module.exports = handler;
