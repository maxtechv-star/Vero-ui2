const YeteeDeel = require('../../lib/scrape_file/downloader/ytd');

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
            views: result.views || 'Unknown',
            sourceUrl: result.sourceUrl || url,
            service: result.service || 'Multiple',
            note: result.note || null
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
                option.quality.toLowerCase().includes(quality.toLowerCase()) ||
                option.format.toLowerCase().includes(quality.toLowerCase())
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
            type: option.format === 'mp3' ? 'audio' : 'video',
            size: option.size || 'Unknown',
            duration: option.duration || result.duration || 'Unknown',
            service: option.service || result.service || 'Unknown',
            note: option.note || null
        }));
        
        // Add count information
        response.videoCount = (result.videos || []).length;
        response.audioCount = (result.audios || []).length;
        response.filteredCount = filteredOptions.length;
        
        // If no download options available
        if (response.downloadOptions.length === 0) {
            response.note = 'No download options available for this video.';
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
        desc: 'Quality filter (e.g., "720p", "1080p", "MP3", "mp4")', 
        example: 'mp3',
        required: false,
        type: 'string'
    }
};
handler.notes = [
    'Uses multiple services including ytmp4.is, youconvert, and yt-search',
    'Supports long videos (up to 24 hours)',
    'MP4 videos use itag18 quality (360p/480p)',
    'Returns direct download links with file size info',
    'Includes video metadata (title, duration, channel, views)'
];

module.exports = handler;
