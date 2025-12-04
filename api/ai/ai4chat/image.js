const src = scrape('ai/ai4chat');

let handler = async (res, req) => {
    try {
        const { text, ratio } = req.query;
        
        const result = await src.image(text, ratio);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'AI 4Chat (Generate Image)';
handler.category = 'AI';
handler.params = {
    text: { desc: 'Input text for generating image.', example: 'Girl wearing glasses' },
    ratio: { desc: 'Input ratio.', options: ['1:1', '16:9', '2:3', '3:2', '4:5', '5:4', '9:16', '21:9', '9:21'] }
};

module.exports = handler;