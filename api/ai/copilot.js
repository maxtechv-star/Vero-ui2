const src = scrape('ai/copilot');

let handler = async (res, req) => {
    try {
        const { text } = req.query;
        
        const result = await src.chat(text);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Microsoft Copilot';
handler.category = 'AI';
handler.params = {
    text: { desc: 'Input text for generating response.', example: 'Hi! How are you?' }
};

module.exports = handler;