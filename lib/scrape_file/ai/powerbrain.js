const axios = require('axios');
const qs = require('qs');

async function powerbrain(question) {
    try {
        if (!question) throw new Error('Question is required.');
        
        const { data } = await axios.post('https://powerbrainai.com/chat.php', qs.stringify({
            message: question,
            messageCount: '1',
        }), {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                origin: 'https://powerbrainai.com',
                referer: 'https://powerbrainai.com/chat.html',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                priority: 'u=0',
                te: 'trailers'
            }
        });
        
        return data.response;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = powerbrain;