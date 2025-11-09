const axios = require('axios');

async function quote(text, name, profile, color = '#333') {
    return new Promise(async (resolve, reject) => {
        const str = {
            type: 'quote',
            format: 'png',
            backgroundColor: color,
            width: 512,
            height: 768,
            scale: 2,
            messages: [
                {
                    avatar: true,
                    from: {
                        id: 2,
                        name,
                        photo: { url: profile }
                    },
                    text
                }
            ]
        };

        try {
            const { data } = await axios.post('https://bot.lyo.su/quote/generate', JSON.stringify(str, null, 2), {
                headers: { 
                    'Content-Type': 'application/json' 
                }
            });
            resolve(Buffer.from(data.result.image, 'base64'));
        } catch (error) {
            reject(new Error(error.message));
        }
    });
}

module.exports = quote;
