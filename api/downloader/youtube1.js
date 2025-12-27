const ytdl = require('../../lib/scrape_file/downloader/ytd');

let handler = async (res, req) => {
    try {
        const { url, type = 'audio', quality = '128' } = req.query;
        
        // Validate URL
        if (!url) return res.reply('URL parameter is required.', { code: 400 });
        
        if (!/youtube\.com|youtu\.be/.test(url)) {
            return res.reply('Invalid YouTube URL. Please provide a valid YouTube video URL.', { code: 400 });
        }
        
        // Process the YouTube download
        const result = await ytdl(url);
        
        if (!result || !result.success) {
            return res.reply('Failed to fetch video information. Please check the URL and try again.', { code: 500 });
        }
        
        // Filter results based on type and quality
        let downloadOptions = [];
        let serviceUsed = 'unknown';
        
        if (type === 'video') {
            downloadOptions = result.videos || [];
            serviceUsed = result.service || 'unknown';
        } else if (type === 'audio') {
            downloadOptions = result.audios || [];
            serviceUsed = result.service || 'unknown';
        } else {
            downloadOptions = [
                ...(result.videos || []),
                ...(result.audios || [])
            ];
            serviceUsed = result.service || 'unknown';
        }
        
        // Filter by quality if specified
        if (quality && downloadOptions.length > 0) {
            const filtered = downloadOptions.filter(option => 
                option.quality.toLowerCase().includes(quality.toLowerCase()) ||
                option.quality.includes(quality)
            );
            
            if (filtered.length > 0) {
                downloadOptions = filtered;
            } else {
                return res.reply({
                    success: false,
                    message: `No ${type} options found with quality "${quality}".`,
                    availableQualities: downloadOptions.map(opt => opt.quality),
                    suggestion: 'Try without the quality filter to see all options.'
                }, { code: 404 });
            }
        }
        
        // Prepare response
        const response = {
            success: true,
            title: result.title,
            thumbnail: result.thumbnail,
            duration: result.duration || 'Unknown',
            service: serviceUsed,
            downloadOptions: downloadOptions.map(option => ({
                quality: option.quality,
                url: option.url,
                format: option.format,
                type: option.type || (option.format === 'mp3' ? 'audio' : 'video'),
                service: option.service || serviceUsed
            })),
            stats: {
                totalOptions: downloadOptions.length,
                videoOptions: (result.videos || []).length,
                audioOptions: (result.audios || []).length
            }
        };
        
        // Add note if cnvmp3 was used
        if (serviceUsed === 'cnvmp3') {
            response.note = "Using cnvmp3 service - provides direct download links with multiple quality options.";
        }
        
        res.reply(response);
        
    } catch (error) {
        console.error('YouTube CNVMP3 Download Error:', error.message);
        
        let errorMessage = 'Failed to process YouTube download. ';
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

handler.alias = 'YouTube Downloader (CNVMP3)';
handler.category = 'Downloader';
handler.status = 'ready';
handler.method = 'GET';
handler.params = {
    url: { 
        desc: 'YouTube video URL', 
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        required: true,
        type: 'string'
    },
    type: { 
        desc: 'Content type', 
        options: ['video', 'audio', 'all'],
        required: false,
        default: 'audio',
        type: 'string'
    },
    quality: { 
        desc: 'Quality filter (e.g., "720", "1080", "128", "320", "mp3", "mp4")', 
        example: '128',
        required: false,
        type: 'string'
    }
};
handler.notes = [
    'Uses multiple services including CNVMP3 for reliable downloads',
    'CNVMP3 provides direct download links with retry mechanism',
    'Video qualities: 144p, 360p, 480p, 720p, 1080p',
    'Audio qualities: 96kbps, 128kbps, 160kbps, 192kbps, 256kbps, 320kbps',
    'Auto-fallback to other services if one fails'
];

module.exports = handler;
