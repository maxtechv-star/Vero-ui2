const axios = require('axios');

let handler = async (res, req) => {
    try {
        const { text } = req.query;
        
        const { data } = await axios.get(`https://rynnhub-brat.hf.space/api/brat?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer' });
        res.sendBuffer(data, { contentType: 'image/png' });
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Brat v1';
handler.category = 'Canvas';
handler.params = {
    text: { desc: 'Input text for creating image.', example: 'Huh??' }
};

module.exports = handler;
