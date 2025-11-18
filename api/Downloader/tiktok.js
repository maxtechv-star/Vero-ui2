const axios = require('axios');
const cheerio = require('cheerio');

async function tiktokDownload(url) {
    try {
        if (!url.includes('tiktok.com')) throw new Error('Invalid TikTok URL.');
        
        // Get initial page to extract form data
        const { data: html, headers } = await axios.get('https://musicaldown.com/en', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            timeout: 30000
        });
        
        const $ = cheerio.load(html);
        
        // Extract form payload
        const payload = {};
        $('#submit-form input').each((i, elem) => {
            const name = $(elem).attr('name');
            const value = $(elem).attr('value');
            if (name) payload[name] = value || '';
        });
        
        // Find empty field for URL
        const urlField = Object.keys(payload).find(key => !payload[key]);
        if (urlField) payload[urlField] = url;
        
        // Submit form to get download links
        const { data } = await axios.post('https://musicaldown.com/download', new URLSearchParams(payload).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': headers['set-cookie']?.join('; ') || '',
                'Origin': 'https://musicaldown.com',
                'Referer': 'https://musicaldown.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            timeout: 30000
        });
        
        const $$ = cheerio.load(data);
        
        // Extract video information
        const videoHeader = $$('.video-header');
        const bgImage = videoHeader.attr('style');
        const coverMatch = bgImage?.match(/url\((.*?)\)/);
        
        // Extract download links
        const downloads = [];
        $$('a.download').each((i, elem) => {
            const $elem = $$(elem);
            const type = $elem.data('event')?.replace('_download_click', '') || 'unknown';
            const label = $elem.text().trim();
            const downloadUrl = $elem.attr('href');
            
            if (downloadUrl && downloadUrl.startsWith('http')) {
                downloads.push({
                    type: type,
                    label: label,
                    url: downloadUrl,
                    quality: type.includes('hd') ? 'HD' : 'SD',
                    format: type.includes('mp3') ? 'audio' : 'video'
                });
            }
        });

        if (downloads.length === 0) {
            throw new Error('No download links found. The video may be private or unavailable.');
        }
        
        return {
            success: true,
            metadata: {
                title: $$('.video-desc').text().trim() || 'No title',
                author: {
                    username: $$('.video-author b').text().trim() || 'Unknown',
                    avatar: $$('.img-area img').attr('src') || null
                },
                cover: coverMatch ? coverMatch[1] : null,
                sourceUrl: url
            },
            downloads: downloads
        };
    } catch (error) {
        throw new Error(`TikTok download failed: ${error.message}`);
    }
}

const handler = async (res, req) => {
    try {
        const { url, type = 'json' } = req.query;
        
        if (!url) {
            return res.reply({
                message: "URL parameter is required",
                usage: "Provide a TikTok video URL to download",
                examples: {
                    standard: "/downloader/tiktok?url=https://vm.tiktok.com/ZSH3eSA7U/",
                    with_download: "/downloader/tiktok?url=https://vm.tiktok.com/ZSH3eSA7U/&type=video"
                },
                supported_urls: [
                    "https://vm.tiktok.com/...",
                    "https://www.tiktok.com/...",
                    "https://tiktok.com/..."
                ]
            }, { code: 400 });
        }

        if (!url.includes('tiktok.com')) {
            return res.reply({
                message: "Invalid TikTok URL",
                provided_url: url,
                supported_domains: ["tiktok.com", "vm.tiktok.com"]
            }, { code: 400 });
        }

        // Get download information
        const result = await tiktokDownload(url);

        // If direct download is requested
        if (type === 'video' && result.downloads.length > 0) {
            const videoDownload = result.downloads.find(d => d.format === 'video') || result.downloads[0];
            
            try {
                const { data: videoBuffer, headers } = await axios.get(videoDownload.url, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
                    }
                });

                const filename = `tiktok_${Date.now()}.mp4`;
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.sendBuffer(videoBuffer, {
                    contentType: headers['content-type'] || 'video/mp4'
                });
            } catch (downloadError) {
                throw new Error(`Failed to download video: ${downloadError.message}`);
            }
        }

        if (type === 'audio' && result.downloads.length > 0) {
            const audioDownload = result.downloads.find(d => d.format === 'audio');
            if (!audioDownload) {
                return res.reply({
                    message: "Audio download not available for this video",
                    available_downloads: result.downloads
                }, { code: 404 });
            }

            try {
                const { data: audioBuffer, headers } = await axios.get(audioDownload.url, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
                    }
                });

                const filename = `tiktok_audio_${Date.now()}.mp3`;
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.sendBuffer(audioBuffer, {
                    contentType: headers['content-type'] || 'audio/mpeg'
                });
            } catch (downloadError) {
                throw new Error(`Failed to download audio: ${downloadError.message}`);
            }
        }

        // Return JSON response with download links
        res.reply({
            success: true,
            input: url,
            ...result,
            downloadOptions: {
                json: "Get download links and metadata",
                video: "Direct video download",
                audio: "Direct audio download (if available)"
            }
        });
        
    } catch (error) {
        console.error('TikTok Download Error:', error);
        res.reply({
            message: "Failed to download TikTok video",
            error: error.message,
            input: req.query.url,
            suggestion: [
                "Check if the TikTok URL is valid and public",
                "Try again in a few moments",
                "Ensure the video is not private or deleted"
            ]
        }, { code: 500 });
    }
};

// API Configuration
handler.alias = 'TikTok Downloader';
handler.category = 'Downloader';
handler.status = 'ready';
handler.method = 'GET';
handler.params = {
    url: {
        desc: 'TikTok video URL',
        required: true,
        type: 'string',
        example: 'https://vm.tiktok.com/ZSH3eSA7U/'
    },
    type: {
        desc: 'Response type',
        required: false,
        type: 'string',
        options: ['json', 'video', 'audio'],
        example: 'json',
        default: 'json'
    }
};

module.exports = handler;
