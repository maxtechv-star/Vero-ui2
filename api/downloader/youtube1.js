
const ytdl = require('../../lib/scrape_file/downloader/ytd');

let handler = async (res, req) => {
    try {
        const { url, quality, type = 'video' } = req.query;
        
        // Validate URL
        if (!url) return res.reply('URL parameter is required.', { code: 400 });
        
        if (!/youtube\.com|youtu\.be/.test(url)) {
            return res.reply('Invalid YouTube URL. Please provide a valid YouTube video URL.', { code: 400 });
        }
        
        // Process the YouTube download
        const result = await YeteeDeel(url);
        
        if (!result || !result.title) {
            return res.reply('Failed to fetch video information. Please check the URL and try again.', { code: 500 });
        }
        
        // Filter results based on type and quality if provided
        let downloadOptions = [];
        if (type === 'video') {
            downloadOptions = result.videos || [];
        } else if (type === 'audio') {
            downloadOptions = result.audios || [];
        } else {
            // Return all options if type not specified
            downloadOptions = [
                ...(result.videos || []),
                ...(result.audios || [])
            ];
        }
        
        // Filter by quality if specified
        if (quality && downloadOptions.length > 0) {
            const filtered = downloadOptions.filter(option => 
                option.quality.toLowerCase().includes(quality.toLowerCase())
            );
            if (filtered.length > 0) {
                downloadOptions = filtered;
            }
        }
        
        // Format response
        const response = {
            success: true,
            title: result.title,
            thumbnail: result.thumbnail,
            downloadOptions: downloadOptions.map(option => ({
                quality: option.quality,
                url: option.url,
                format: option.format,
                type: option.format.includes('audio') ? 'audio' : 'video'
            }))
        };
        
        // Add note if quality was specified but not found
        if (quality && response.downloadOptions.length === 0) {
            response.note = `Quality "${quality}" not found. Showing all available options.`;
            response.downloadOptions = [
                ...(result.videos || []).map(v => ({...v, type: 'video'})),
                ...(result.audios || []).map(a => ({...a, type: 'audio'}))
            ];
        }
        
        // If no download options found
        if (response.downloadOptions.length === 0) {
            response.note = 'No download options available for this video.';
        }
        
        res.reply(response);
        
    } catch (error) {
        console.error('YouTube Download Error:', error.message);
        res.reply(
            error.message.includes('timeout') 
                ? 'Request timeout. Please try again.' 
                : 'Failed to fetch video information. Please check the URL and try again.',
            { code: 500 }
        );
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
    type: { 
        desc: 'Content type to download', 
        options: ['video', 'audio', 'all'],
        required: false,
        default: 'video',
        type: 'string'
    },
    quality: { 
        desc: 'Quality filter (e.g., "720p", "1080p", "MP3", "360p")', 
        example: '720p',
        required: false,
        type: 'string'
    }
};
handler.notes = [
    'Supports YouTube videos, shorts, and embedded links',
    'Returns multiple quality options for both video and audio',
    'Video formats: MP4, WebM',
    'Audio formats: M4A, WebM',
    'Thumbnail included in response',
    'Use quality parameter to filter specific resolutions'
];

module.exports = handler;
