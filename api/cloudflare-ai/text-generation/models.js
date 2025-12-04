const src = scrape('ai/cfchat');

let handler = async (res, req) => {
    try {
        const result = await src.models();
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Cloudflare Text Generation (Models)';
handler.category = 'Cloudflare AI';

module.exports = handler;