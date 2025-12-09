
/*
  y2mate.nu YouTube Downloader - Simplified Version
  Supports: MP3 and MP4 downloads from YouTube
*/

const fetch = require('node-fetch');
const axios = require('axios');

const y2mate = {
    getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://y2mate.nu/',
            'Origin': 'https://y2mate.nu'
        };
    },

    extractVideoId(url) {
        try {
            // Handle youtu.be links
            if (url.includes('youtu.be/')) {
                return url.split('youtu.be/')[1].split('?')[0].substring(0, 11);
            }
            
            // Handle youtube.com links
            if (url.includes('v=')) {
                return url.split('v=')[1].split('&')[0].substring(0, 11);
            }
            
            // Handle youtube.com/shorts/
            if (url.includes('/shorts/')) {
                return url.split('/shorts/')[1].split('?')[0].substring(0, 11);
            }
            
            throw new Error('Could not extract video ID');
        } catch (e) {
            throw new Error('Invalid YouTube URL format');
        }
    },

    async getAPI() {
        try {
            // First get the homepage to find the API endpoint
            const response = await fetch('https://y2mate.nu', {
                headers: this.getHeaders()
            });
            
            const html = await response.text();
            
            // Try to find API URL in script tags
            const scriptRegex = /<script[^>]*src="([^"]*api[^"]*)"[^>]*>/i;
            const scriptMatch = html.match(scriptRegex);
            
            if (scriptMatch && scriptMatch[1]) {
                return 'https://y2mate.nu' + scriptMatch[1];
            }
            
            // Alternative pattern
            const apiRegex = /apiUrl\s*=\s*['"]([^'"]+)['"]/;
            const apiMatch = html.match(apiRegex);
            
            if (apiMatch && apiMatch[1]) {
                return apiMatch[1];
            }
            
            // Fallback to known API endpoint
            return 'https://y2mate.nu/api/init';
            
        } catch (error) {
            console.error('Error getting API:', error.message);
            // Fallback URL
            return 'https://y2mate.nu/api/init';
        }
    },

    async download(url, format = 'mp3') {
        try {
            const videoId = this.extractVideoId(url);
            console.log(`Video ID: ${videoId}`);
            
            // Try direct approach with known pattern
            const apiUrl = `https://y2mate.nu/api/convert`;
            
            const payload = {
                v: videoId,
                f: format,
                _: Date.now()
            };
            
            console.log(`Calling API: ${apiUrl}`);
            
            const response = await axios.post(apiUrl, payload, {
                headers: this.getHeaders(),
                timeout: 30000
            });
            
            if (response.data && response.data.success) {
                return {
                    title: response.data.title || 'YouTube Video',
                    downloadURL: response.data.url || response.data.downloadURL,
                    format: format
                };
            } else if (response.data && response.data.url) {
                // Alternative response format
                return {
                    title: 'YouTube Video',
                    downloadURL: response.data.url,
                    format: format
                };
            } else {
                throw new Error('Invalid API response: ' + JSON.stringify(response.data));
            }
            
        } catch (error) {
            // If API call fails, try alternative method
            console.log('Primary method failed, trying alternative...');
            
            try {
                // Alternative: Use a proxy API approach
                const altUrl = `https://y2mate.nu/api/widget?url=${encodeURIComponent(url)}&format=${format}`;
                
                const altResponse = await axios.get(altUrl, {
                    headers: this.getHeaders(),
                    timeout: 30000
                });
                
                if (altResponse.data && altResponse.data.downloadUrl) {
                    return {
                        title: altResponse.data.title || 'YouTube Video',
                        downloadURL: altResponse.data.downloadUrl,
                        format: format
                    };
                }
                
                throw new Error('Alternative method also failed');
                
            } catch (altError) {
                throw new Error(`Download failed: ${error.message}. Alternative: ${altError.message}`);
            }
        }
    }
};

module.exports = async (url, format = 'mp3') => {
    try {
        // Basic validation
        if (!url || typeof url !== 'string') {
            return {
                success: false,
                message: 'URL is required'
            };
        }
        
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            return {
                success: false,
                message: 'Only YouTube URLs are supported'
            };
        }
        
        if (format !== 'mp3' && format !== 'mp4') {
            return {
                success: false,
                message: 'Format must be mp3 or mp4'
            };
        }
        
        const result = await y2mate.download(url, format);
        
        return {
            success: true,
            format: result.format,
            title: result.title || 'YouTube Video',
            downloadUrl: result.downloadURL,
            directUrl: result.downloadURL,
            note: 'Use the downloadUrl to download the file'
        };
        
    } catch (error) {
        return {
            success: false,
            message: error.message,
            suggestion: 'Try again later or use a different YouTube URL'
        };
    }
};
