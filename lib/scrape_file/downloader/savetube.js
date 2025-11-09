const axios = require('axios');
const crypto = require('crypto');

async function savetube(link, format = '360') {
    try {
        if (!/^https?:\/\//i.test(link)) throw new Error('Invalid url.');
        
        const patterns = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/
        ];
        const id = patterns.find(p => p.test(link))?.[Symbol.match](link)?.[1];
        if (!id) throw new Error('Failed to extract link.');
        
        const formats = ['144', '240', '360', '480', '720', '1080', 'mp3'];
        if (!formats.includes(format)) throw new Error(`Available formats: ${formats.join(', ')}.`);
    
        const headers = {
            'accept': '*/*',
            'content-type': 'application/json',
            'origin': 'https://yt.savetube.me',
            'referer': 'https://yt.savetube.me/',
            'user-agent': 'Postify/1.0.0'
        };
        
        const { data: cdnData } = await axios.get('https://media.savetube.me/api/random-cdn', { headers });
        const cdn = cdnData.cdn;
        
        const { data: infoData } = await axios.post(`https://${cdn}/api/v2/info`, {
            url: `https://www.youtube.com/watch?v=${id}`
        }, { headers });
        
        const encrypted = Buffer.from(infoData.data, 'base64');
        const iv = encrypted.slice(0, 16);
        const content = encrypted.slice(16);
        const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12'.match(/.{2}/g).join(''), 'hex');
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        const decrypted = JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
        
        const { data: dlData } = await axios.post(`https://${cdn}/api/download`, {
            id,
            downloadType: format === 'mp3' ? 'audio' : 'video',
            quality: format === 'mp3' ? '128' : format,
            key: decrypted.key
        }, { headers });
    
        const sec = decrypted.duration;
        return {
            title: decrypted.title || 'No Title',
            type: format === 'mp3' ? 'audio' : 'video',
            format,
            quality: format === 'mp3' ? '128' : format,
            duration: `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`,
            cover: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
            downloadUrl: dlData.data.downloadUrl
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = savetube;