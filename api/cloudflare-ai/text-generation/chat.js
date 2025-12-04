const src = scrape('ai/cfchat');

let handler = async (res, req) => {
    try {
        const { model, ...params } = req.body;
        
        const result = await src.chat({
            ...params
        }, {
            model: model
        });
        
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Cloudflare Text Generation (Chat)';
handler.category = 'AI';
handler.method = 'POST';
handler.body = {
    messages: [{ role: 'user', content: 'Hi! How are you?' }],
    model: '@cf/microsoft/phi-2'
};

module.exports = handler;
