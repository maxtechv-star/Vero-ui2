
const ytdl = require('../../lib/scrape_file/downloader/ytd');
let handler = async (res, req) => {
    try {
        const { url, quality, type = 'video' } = req.query;
        
        // Validate URL
        if (!url) return res.reply('URL parameter is required.', { code: 400 });
        
        // Process the YouTube download
        const result = await YeteeDeel(url);
        
        if (!result || !result.success) {
            return res.reply('Failed to fetch video information. Please check the URL and try again.', { code: 500 });
        }
        
        // Prepare response with all video info
        const response = {
            success: true,
            title: result.title,
            thumbnail: result.thumbnail,
            duration: result.duration || 'Unknown',
            channel: result.channel || 'Unknown',
            sourceUrl: result.sourceUrl || url
        };
        
        // Filter options based on type
        let availableOptions = [];
        if (type === 'video' || type === 'all') {
            availableOptions = [...availableOptions, ...(result.videos || [])];
        }
        if (type === 'audio' || type === 'all') {
            availableOptions = [...availableOptions, ...(result.audios || [])];
        }
        
        // Filter by quality if specified
        let filteredOptions = availableOptions;
        if (quality && availableOptions.length > 0) {
            filteredOptions = availableOptions.filter(option => 
                option.quality.toLowerCase().includes(quality.toLowerCase())
            );
            
            // If no match found with quality filter, show all options with a note
            if (filteredOptions.length === 0) {
                response.note = `No options found matching "${quality}". Showing all available options.`;
                filteredOptions = availableOptions;
            }
        }
        
        response.downloadOptions = filteredOptions.map(option => ({
            quality: option.quality,
            url: option.url,
            format: option.format,
            type: option.format === 'mp3' ? 'audio' : 'video'
        }));
        
        // Add count information
        response.videoCount = (result.videos || []).length;
        response.audioCount = (result.audios || []).length;
        response.filteredCount = filteredOptions.length;
        
        // Add service note if present
        if (result.note) {
            response.serviceNote = result.note;
        }
        
        // If no download options available
        if (response.downloadOptions.length === 0) {
            response.note = 'No download options available for this video. It might be private, age-restricted, or unavailable for download.';
        }
        
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
    'Uses yt-search for reliable video information',
    'Returns multiple quality options for both video and audio',
    'Video formats: MP4, WebM',
    'Audio formats: MP3, M4A, WebM',
    'Includes video thumbnail, duration, and channel info',
    'Some download links might be placeholders requiring service integration'
];

module.exports = handler;
