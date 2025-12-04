const src = scrape('ai/ai4chat');

let handler = async (res, req) => {
    try {
        const { text } = req.query;
        
        const result = await src.chat(text);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'AI 4Chat (Text Generation)';
handler.category = 'AI';
handler.params = {
    text: { desc: 'Input text for generating response.', example: 'Hi! How are you?' }
};

module.exports = handler;