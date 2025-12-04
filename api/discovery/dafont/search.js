const src = scrape('dafont');

let handler = async (res, req) => {
    try {
        const { q } = req.query;
        
        const result = await src.search(q);
        res.reply(result);
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Dafont Search';
handler.category = 'Discovery';
handler.params = {
    q: { desc: 'Search term or keyword.', example: 'Coolvetica' }
};

module.exports = handler;
