const axios = require('axios');
const cheerio = require('cheerio');

let handler = async (res, req) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.reply({
                success: false,
                error: "URL parameter is required",
                message: "Please provide an Instagram URL"
            }, { code: 400 });
        }

        // Validate Instagram URL
        const instagramPattern = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[a-zA-Z0-9_-]+\/?/i;
        if (!instagramPattern.test(url)) {
            return res.reply({
                success: false,
                error: "Invalid Instagram URL",
                message: "Supported formats: posts, reels, IGTV, stories"
            }, { code: 400 });
        }

        const form = new URLSearchParams({ 
            url: url + "&lang=en" 
        });
        
        const headers = { 
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        
        const response = await axios.post("https://api.downloadgram.app/media", form, { 
            headers,
            timeout: 30000
        });

        // Extract HTML from response
        let html = "";
        if (typeof response.data === 'string') {
            const match = response.data.match(/innerHTML\s*=\s*"([^]+?)";/);
            if (match && match[1]) {
                html = match[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, "")
                    .replace(/\\t/g, "");
            } else {
                // Try direct HTML if pattern not found
                html = response.data;
            }
        } else {
            // If response is already an object, convert to string
            html = JSON.stringify(response.data);
        }

        if (!html || html.trim() === '') {
            return res.reply({
                success: false,
                error: "Empty response",
                message: "No content received from Instagram download service"
            }, { code: 500 });
        }

        const $ = cheerio.load(html);
        const links = $(".download-items__btn a").map((_, el) => $(el).attr("href")).get();

        if (!links || links.length === 0) {
            // Try alternative selectors
            const altLinks = $("a[href*='.mp4'], a[href*='.jpg'], a[href*='.png'], a[href*='.jpeg']").map((_, el) => $(el).attr("href")).get();
            
            if (altLinks.length === 0) {
                return res.reply({
                    success: false,
                    error: "No media found",
                    message: "Could not extract any media from this Instagram post"
                }, { code: 404 });
            }
            
            links.push(...altLinks);
        }

        // Filter and format media links
        const media = links
            .filter(link => link && typeof link === 'string')
            .map(link => ({
                url: link,
                type: link.includes(".mp4") || link.includes(".mov") || link.includes(".avi") ? "video" : "image",
                format: link.includes(".mp4") ? "mp4" : 
                       link.includes(".mov") ? "mov" : 
                       link.includes(".avi") ? "avi" :
                       link.includes(".png") ? "png" : "jpg",
                quality: link.includes("/hd/") || link.includes("_hd") ? "HD" : 
                        link.includes("/sd/") || link.includes("_sd") ? "SD" : "Unknown"
            }))
            .filter(item => item.url.startsWith('http')); // Ensure valid URLs

        if (media.length === 0) {
            return res.reply({
                success: false,
                error: "No valid media found",
                message: "Could not extract valid media URLs from this Instagram post"
            }, { code: 404 });
        }

        // Extract additional metadata if available
        const title = $("h1, h2, h3, .title, .caption").first().text().trim() || '';
        const description = $("p, .description, .caption").first().text().trim() || '';
        
        // Group by type for better organization
        const videos = media.filter(item => item.type === "video");
        const images = media.filter(item => item.type === "image");

        return res.reply({
            success: true,
            data: {
                total: media.length,
                videos: videos,
                images: images,
                all: media
            },
            metadata: {
                title: title || null,
                description: description || null,
                source_url: url,
                note: videos.length > 0 ? "Multiple quality options available" : "Image download ready"
            },
            message: `Found ${media.length} media items (${videos.length} videos, ${images.length} images)`
        });

    } catch (error) {
        console.error("Instagram Download Error:", error.message);
        
        // Handle specific error cases
        let errorMessage = "An error occurred while downloading from Instagram";
        let errorCode = 500;
        
        if (error.code === 'ECONNABORTED') {
            errorMessage = "Request timeout. The Instagram service is taking too long to respond.";
            errorCode = 504;
        } else if (error.response) {
            // Server responded with error status
            errorMessage = `Service error: ${error.response.status} ${error.response.statusText}`;
            errorCode = error.response.status;
        } else if (error.request) {
            // No response received
            errorMessage = "No response from Instagram download service";
            errorCode = 502;
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        return res.reply({
            success: false,
            error: "Download failed",
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { code: errorCode });
    }
};

handler.alias = 'Instagram Downloader';
handler.category = 'Downloader';
handler.method = 'GET';
handler.status = 'ready';
handler.params = {
    url: { 
        desc: 'Instagram post URL (supports posts, reels, IGTV, stories)', 
        required: true,
        type: 'string',
        example: 'https://www.instagram.com/p/Cxxxxxxxxxx/'
    }
};

handler.notes = [
    'Supports all Instagram content types: posts, reels, IGTV, stories',
    'Returns direct download links for media files',
    'Automatic detection of video and image content',
    'Includes quality indicators when available',
    'May take a few seconds to process, especially for high-quality videos',
    'Service powered by downloadgram.app'
];

handler.examples = [
    {
        description: 'Download a regular Instagram post',
        url: '/downloader/Instagram?url=https://www.instagram.com/p/Cxxxxxxxxxx/'
    },
    {
        description: 'Download an Instagram reel',
        url: '/downloader/Instagram?url=https://www.instagram.com/reel/Cxxxxxxxxxx/'
    },
    {
        description: 'Download IGTV video',
        url: '/downloader/Instagram?url=https://www.instagram.com/tv/Cxxxxxxxxxx/'
    }
];

module.exports = handler;
