const ytdl = require('../../lib/scrape_file/downloader/ytd');

let handler = async (res, req) => {
    try {
        const { url, format } = req.query;
        
        // Validate URL
        if (!url) return res.reply('URL parameter is required.', { code: 400 });
        
        // Validate format
        const validFormats = ['mp3', 'mp4'];
        if (!validFormats.includes(format)) {
            return res.reply(`Invalid format. Available formats: ${validFormats.join(', ')}`, { code: 400 });
        }
        
        // Process the YouTube download
        const yt = new ytdl();
        const result = await yt.process(url, format);
        
        // Handle different response formats
        if (result.status === false) {
            return res.reply(result.msg || 'Download failed', { code: 500 });
        }
        
        // Return successful response
        res.reply({
            success: true,
            title: result.title || 'Unknown',
            type: format,
            downloadUrl: result.dl,
            cached: result.cached,
            note: format === 'mp4' ? 'Video may be in 720p or 1080p quality' : 'Audio is 128kbps MP3'
        });
        
    } catch (error) {
        res.reply(error.message || 'Internal server error', { code: 500 });
    }
};

handler.alias = 'YouTube Downloader';
handler.category = 'Downloader';
handler.status = 'ready'; // Changed from 'error' to 'ready'
handler.method = 'GET';
handler.params = {
    url: { 
        desc: 'YouTube video URL (watch, shorts, embed, or youtu.be)', 
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        required: true 
    },
    format: { 
        desc: 'Output format', 
        options: ['mp3', 'mp4'],
        required: true,
        example: 'mp3'
    }
};
handler.notes = [
    'Maximum video length: 30 minutes',
    'Videos longer than 30 minutes will be rejected',
    'MP4 videos are typically 720p or 1080p quality',
    'MP3 audio is 128kbps quality',
    'First request may take longer due to processing'
];

module.exports = handler;
