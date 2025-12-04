const src = scrape('ai/ss2code');

let handler = async (res, req) => {
    try {
        const { imageUrl } = req.query;
        
        const buffer = await res.getBuffer(imageUrl, { mime: 'image' });
        const result = await src(buffer);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Screenshot To Code';
handler.category = 'AI';
handler.params = {
    imageUrl: { desc: 'URL of the image to be used (recommended to use tmpfiles).', example: 'https://tmpfiles.org/...' }
};

module.exports = handler;