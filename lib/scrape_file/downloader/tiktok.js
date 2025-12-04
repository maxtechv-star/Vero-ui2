const axios = require('axios');

async function ttdl(url) {
    try {
        if (!url.includes('tiktok.com')) throw new Error('Invalid url.');
        
        const { data } = await axios(`https://tikwm.com/api/?url=${url}`);
        
        return {
            title: data.data.title,
            cover: data.data.cover,
            create_at: new Date(data.data.create_time * 1000).toLocaleString('ID').toString(),
            stats: {
                play: Number(data.data.play_count).toLocaleString(),
                like: Number(data.data.digg_count).toLocaleString(),
                comment: Number(data.data.comment_count).toLocaleString(),
                share: Number(data.data.share_count).toLocaleString()
            },
            music_info: {
                title: data.data.music_info.title,
                author: data.data.music_info.author
            },
            author: {
                name: data.data.author.nickname,
                username: '@' + data.data.author.unique_id,
                avatar: data.data.author.avatar
            },
            musicUrl: data.data.music,
            ...(data.data.images ? { images: data.data.images } : { videoUrl: data.data.play })
        };
    } catch (error) {
        throw new Error(error.message || 'No result found.');
    }
};

module.exports = ttdl;