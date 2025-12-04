const axios = require('axios');
const ua = require('user-agents');

class AIChat {
    chat = async function (text) {
        try {
            if (!text) throw new Error('Text is required.');
            
            const { data } = await axios.get('https://yw85opafq6.execute-api.us-east-1.amazonaws.com/default/boss_mode_15aug', {
                params: {
                    text: text,
                    country: 'Asia',
                    user_id: 'k2r4gMUJfN'
                },
                headers: {
                    Accept: '*/*',
                    'Accept-Language': 'id-ID,id;q=0.9',
                    Origin: 'https://www.ai4chat.co',
                    Priority: 'u=1, i',
                    Referer: 'https://www.ai4chat.co/',
                    'Sec-CH-UA': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
                    'Sec-CH-UA-Mobile': '?1',
                    'Sec-CH-UA-Platform': '"Android"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
                }
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message || 'No result found.');
        }
    }
    
    image = async function (prompt, ratio = '1:1') {
        try {
            const _ratio = ['1:1', '16:9', '2:3', '3:2', '4:5', '5:4', '9:16', '21:9', '9:21'];
            
            if (!prompt) throw new Error('Prompt is required.');
            if (!_ratio.includes(ratio)) throw new Error(`Available ratios: ${_ratio.join(', ')}.`);
            
            const { data } = await axios.get('https://www.ai4chat.co/api/image/generate', {
                params: {
                    prompt: prompt,
                    aspect_ratio: ratio
                },
                headers: {
                    accept: '*/*',
                    'content-type': 'application/json',
                    referer: 'https://www.ai4chat.co/image-pages/realistic-ai-image-generator',
                    'user-agent': ua.toString()
                }
            });
            
            return data.image_link;
        } catch (error) {
            throw new Error(error.message || 'No result found.');
        }
    }
}

module.exports = new AIChat();