
const axios = require('axios');

const yt = {
    get baseHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://ytmp3.cx',
            'Referer': 'https://ytmp3.cx/',
            'Connection': 'keep-alive'
        }
    },

    extractVideoId: function (url) {
        let match;
        if (url.includes('youtu.be')) {
            match = url.match(/\/([a-zA-Z0-9_-]{11})(?:\?|$)/);
        } else if (url.includes('youtube.com')) {
            if (url.includes('/shorts/')) {
                match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
            } else {
                match = url.match(/v=([a-zA-Z0-9_-]{11})/);
            }
        }
        
        if (!match || !match[1]) {
            throw new Error(`Invalid YouTube URL: ${url}`);
        }
        return match[1];
    },

    download: async function (url, format = 'mp4') {
        if (!['mp3', 'mp4'].includes(format)) {
            throw new Error('Format must be mp3 or mp4');
        }
        
        const videoId = this.extractVideoId(url);
        const headers = this.baseHeaders;

        try {
            // Direct API endpoint - no need to scrape JavaScript
            const apiUrl = 'https://ytmp3.cx/api/convert';
            
            const payload = {
                v: videoId,
                f: format,
                _: Date.now()
            };

            console.log('Making request to:', apiUrl);
            console.log('Payload:', payload);

            const response = await axios.post(apiUrl, payload, {
                headers: headers,
                timeout: 30000
            });

            const data = response.data;

            if (data.error) {
                throw new Error(data.error);
            }

            // Handle different response formats
            if (data.downloadURL) {
                return {
                    title: data.title || 'YouTube Video',
                    downloadURL: data.downloadURL,
                    format: format,
                    videoId: videoId,
                    duration: data.duration,
                    quality: data.quality
                };
            } else if (data.url) {
                return {
                    title: data.title || 'YouTube Video',
                    downloadURL: data.url,
                    format: format,
                    videoId: videoId,
                    duration: data.duration,
                    quality: data.quality
                };
            } else {
                throw new Error('No download URL found in response');
            }

        } catch (error) {
            console.error('Download error:', error.message);
            
            if (error.response) {
                // Server responded with error status
                throw new Error(`Server error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                // Request was made but no response received
                throw new Error('No response from server - service might be down');
            } else {
                // Something else happened
                throw new Error(`Download failed: ${error.message}`);
            }
        }
    }
};

let handler = async (res, req) => {
    try {
        const { url, format = 'mp4' } = req.query;
        
        if (!url) {
            return res.reply('URL parameter is required.', { code: 400 });
        }
        
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            return res.reply('Invalid YouTube URL. Must be from youtube.com or youtu.be', { code: 400 });
        }
        
        if (!['mp3', 'mp4'].includes(format)) {
            return res.reply('Format must be mp3 or mp4.', { code: 400 });
        }
        
        const result = await yt.download(url, format);
        
        const response = {
            status: true,
            data: {
                title: result.title,
                downloadUrl: result.downloadURL,
                format: result.format,
                videoId: result.videoId,
                type: format === 'mp3' ? 'audio' : 'video',
                duration: result.duration,
                quality: result.quality
            },
            message: `Successfully converted YouTube video to ${format.toUpperCase()}`
        };
        
        res.reply(response);
        
    } catch (error) {
        console.error("YouTube Download Handler Error:", error.message);
        
        res.reply({
            status: false,
            error: "Download failed",
            message: error.message,
            suggestion: "Please try again with a different video or check the URL"
        }, { code: 500 });
    }
};

handler.alias = 'YouTube Downloader';
handler.category = 'Downloader';
handler.status = 'working';
handler.params = {
    url: { 
        desc: 'YouTube video URL (YouTube.com or youtu.be)', 
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        required: true,
        type: 'string'
    },
    format: { 
        desc: 'Output format - mp3 for audio, mp4 for video', 
        options: ['mp3', 'mp4'],
        required: false,
        type: 'string',
        default: 'mp4'
    }
};

module.exports = handler;
