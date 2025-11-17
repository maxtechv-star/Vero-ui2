const src = require('../../lib/scrape_file/downloader/savetube');

let handler = async (res, req) => {
    try {
        const { url, format } = req.query;
        if (!/youtube.com|youtu.be/.test(url)) return res.reply('Invalid url.', { code: 400 });
        
        const result = await src(url, format);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'YouTube Downloader';
handler.category = 'downloader';
handler.status = 'ready'; 
handler.params = {
    url: { desc: 'Input url from youtube.', example: 'https://youtube.com/...' },
    format: { desc: 'Input format.', options: ['144', '240', '360', '480', '720', '1080', 'mp3'] }
};

module.exports = handler;
