const src = scrape('ai/powerbrain');

let handler = async (res, req) => {
    try {
        const { text } = req.query;
        
        const result = await src(text);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Powerbrain AI';
handler.category = 'AI';
handler.params = {
    text: { desc: 'Input text for generating response.', example: 'Hi! How are you?' }
};

module.exports = handler;