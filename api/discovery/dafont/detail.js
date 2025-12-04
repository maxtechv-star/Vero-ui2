const src = scrape('dafont');

let handler = async (res, req) => {
    try {
        const { url } = req.query;
        if (!url.includes('dafont.com')) return res.reply('Invalid url.', { code: 400 });
        
        const result = await src.detail(url);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Dafont Detail';
handler.category = 'Discovery';
handler.params = {
    url: { desc: 'Input url from dafont.', example: 'https://dafont.com/...' }
};

module.exports = handler;
