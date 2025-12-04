const src = scrape('downloader/threads');

let handler = async (res, req) => {
    try {
        const { url } = req.query;
        if (!url.includes('www.threads.com')) return res.reply('Invalid url.', { code: 400 });
        
        const result = await src(url);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Threads Downloader';
handler.category = 'Downloader';
handler.params = {
    url: { desc: 'Input url from threads.', example: 'https://www.threads.com/...' }
};

module.exports = handler;