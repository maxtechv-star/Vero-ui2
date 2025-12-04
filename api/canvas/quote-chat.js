const src = scrape('canvas/quote-chat');

let handler = async (res, req) => {
    try {
        const { text, name, profile, color } = req.query;
        
        const result = await src(text, name, profile, color);
        res.sendBuffer(result, { contentType: 'image/png' });
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Quote Chat';
handler.category = 'Canvas';
handler.params = {
    text: { desc: 'Input text.', example: 'Hi!' },
    name: { desc: 'Input name.', example: 'Rynn' },
    profile: { desc: 'URL of the image to be used (recommended to use tmpfiles).', example: 'https://tmpfiles.org/...' },
    color: { desc: 'Input color.', required: false, example: '#333' }
};

module.exports = handler;
