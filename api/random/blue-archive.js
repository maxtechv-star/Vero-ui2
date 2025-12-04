const axios = require('axios');

let handler = async (res) => {
    try {
        const { data: a } = await axios.get(`https://raw.githubusercontent.com/rynn-k/blue-archive-r-img/refs/heads/main/links.json`);
        const { data } = await axios.get(a.randomize(), { responseType: 'arraybuffer' });
        res.sendBuffer(data, { contentType: 'image/png' });
    } catch (error) {
        res.reply(error.message, { code: 500 });
    }
};

handler.alias = 'Blue Archive';
handler.category = 'Random';

module.exports = handler;
