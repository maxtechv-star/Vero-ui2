const YeteeDeel = require('../../lib/scrape_file/downloader/ytd');

let handler = async (res, req) => {
    try {
        const { url, quality, type } = req.query;
        
        // Validate URL
        if (!url) return res.reply('URL parameter is required.', { code: 400 });
        
        if (!/youtube\.com|youtu\.be/.test(url)) {
            return res.reply('Invalid YouTube URL. Please provide a valid YouTube video URL.', { code: 400 });
        }
        
        // Determine type based on quality or explicit parameter
        let downloadType = type;
        if (!downloadType) {
            if (quality && (quality.includes('mp3') || quality === '128')) {
                downloadType = 'audio';
            } else {
                downloadType = 'video';
            }
        }
        
        // Process the YouTube download
        const result = await YeteeDeel(url, quality, downloadType);
        
        if (!result || !result.success) {
            return res.reply('Failed to fetch video information. Please check the URL and try again.', { code: 500 });
        }
        
        // Format response
        const response = {
            success: true,
            title: result.title,
            thumbnail: result.thumbnail,
            duration: result.duration,
            downloadUrl: result.downloadUrl,
            quality: result.quality,
            type: result.type,
            availableQualities: result.availableQualities,
            note: `Download ${result.type} in ${result.quality} quality`
        };
        
        res.reply(response);
        
    } catch (error) {
        console.error('YouTube Download Error:', error.message);
        
        let errorMessage = 'Failed to fetch video information. ';
        if (error.message.includes('Invalid YouTube URL')) {
            errorMessage = 'Invalid YouTube URL format. Please provide a valid YouTube video URL.';
        } else if (error.message.includes('No download options')) {
            errorMessage = error.message;
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timeout. The service might be busy. Please try again.';
        }
        
        res.reply(errorMessage, { code: 500 });
    }
};

handler.alias = 'YouTube Downloader';
handler.category = 'Downloader';
handler.status = 'ready';
handler.method = 'GET';
handler.params = {
    url: { 
        desc: 'YouTube video URL (watch, shorts, embed, or youtu.be)', 
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        required: true,
        type: 'string'
    },
    quality: { 
        desc: 'Video quality (144, 240, 360, 480, 720, 1080) or "128" for MP3 audio', 
        example: '720',
        required: false,
        type: 'string'
    },
    type: { 
        desc: 'Download type (video or audio)', 
        options: ['video', 'audio'],
        required: false,
        type: 'string'
    }
};
handler.notes = [
    'Supports YouTube videos, shorts, and embedded links',
    'Video qualities: 144p, 240p, 360p, 480p, 720p, 1080p',
    'Audio quality: 128kbps MP3',
    'Direct download links provided',
    'Includes video thumbnail and duration'
];

module.exports = handler;
