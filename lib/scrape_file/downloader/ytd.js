const ytSearch = require('yt-search');
const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const FormData = require('form-data');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// Initialize cnvmp3 service
const cnvmp3 = (() => {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    
    const api = {
        base: 'https://cnvmp3.com',
        endpoints: {
            info: '/get_video_data.php',
            download: '/download_video_ucep.php'
        }
    };

    const headers = {
        accept: '*/*',
        'content-type': 'application/json',
        origin: 'https://cnvmp3.com',
        referer: 'https://cnvmp3.com/v25',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const getQuality = (fmt, value) => {
        if (fmt === 1) {
            const audios = { 320: 0, 256: 1, 192: 2, 160: 3, 128: 4, 96: 5 };
            return audios[value] ?? null;
        }
        if (fmt === 0) {
            const videos = [144, 360, 480, 720, 1080];
            return videos.includes(value) ? value : null;
        }
        return null;
    };

    const info = async (url) => {
        try {
            const res = await client.post(`${api.base}${api.endpoints.info}`, {
                url,
                token: '1234'
            }, {
                headers: headers,
                timeout: 10000
            });

            if (res.data?.success && res.data?.title) {
                return {
                    success: true,
                    code: 200,
                    result: { 
                        title: res.data.title,
                        duration: res.data.duration,
                        thumbnail: res.data.thumbnail
                    }
                };
            }

            return {
                success: false,
                code: 404,
                result: { error: 'Video title not found' }
            };
        } catch (err) {
            return {
                success: false,
                code: err?.response?.status || 500,
                result: {
                    error: 'Error fetching video info',
                    details: err.message
                }
            };
        }
    };

    const download = async ({ url, fmt = 1, quality = 128 }, maxTries = 10, delayMs = 2000) => {
        const q = getQuality(fmt, quality);

        if (!url || typeof url !== 'string' || !url.includes('youtu')) {
            return {
                success: false,
                code: 400,
                result: { error: 'Invalid YouTube URL' }
            };
        }

        if (![0, 1].includes(fmt)) {
            return {
                success: false,
                code: 400,
                result: { error: 'Format must be 0 (video) or 1 (audio)' }
            };
        }

        if (q === null) {
            return {
                success: false,
                code: 400,
                result: {
                    error: fmt === 1
                        ? 'Invalid audio bitrate. Use: 96, 128, 160, 192, 256, 320'
                        : 'Invalid video resolution. Use: 144, 360, 480, 720, 1080'
                }
            };
        }

        const i = await info(url);
        if (!i.success) return i;

        const payload = {
            url,
            title: i.result.title,
            quality: q,
            formatValue: fmt
        };

        for (let attempt = 1; attempt <= maxTries; attempt++) {
            try {
                const res = await client.post(`${api.base}${api.endpoints.download}`, payload, {
                    headers: headers,
                    timeout: 20000,
                    validateStatus: s => s === 200
                });

                const dlink = res.data?.download_link;
                if (!dlink || typeof dlink !== 'string' || dlink.trim() === '') {
                    if (attempt < maxTries) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                        continue;
                    }
                    return {
                        success: false,
                        code: 422,
                        result: { error: 'Download link not available' }
                    };
                }

                return {
                    success: true,
                    code: 200,
                    result: {
                        type: fmt === 1 ? 'audio' : 'video',
                        title: i.result.title,
                        duration: i.result.duration,
                        thumbnail: i.result.thumbnail,
                        quality: fmt === 1 ? `${quality}kbps` : `${quality}p`,
                        attempt,
                        dlink,
                        format: fmt === 1 ? 'mp3' : 'mp4'
                    }
                };
            } catch (err) {
                if (attempt < maxTries) await new Promise(resolve => setTimeout(resolve, delayMs));
                else return {
                    success: false,
                    code: err?.response?.status || 500,
                    result: {
                        error: 'Download failed',
                        details: err.message
                    }
                };
            }
        }
    };

    return {
        api,
        headers,
        getQuality,
        info,
        download
    };
})();

async function YeteeDeel(youtubeUrl) {
    try {
        // Clean and validate URL
        const cleanUrl = youtubeUrl.trim();
        
        if (!isValidYouTubeUrl(cleanUrl)) {
            throw new Error("Invalid YouTube URL format");
        }
        
        // Extract video ID
        const videoId = extractVideoId(cleanUrl);
        if (!videoId) {
            throw new Error("Could not extract video ID from URL");
        }
        
        console.log(`Processing YouTube video: ${videoId}`);
        
        // Method 1: Try cnvmp3 first (best for direct downloads)
        let result = await tryCnvmp3(cleanUrl);
        
        // Method 2: If cnvmp3 fails, try youconvert
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("cnvmp3 failed, trying youconvert...");
            result = await tryYouConvert(cleanUrl);
        }
        
        // Method 3: If both fail, try yt-search
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("youconvert failed, trying yt-search...");
            result = await tryYtSearch(videoId);
        }
        
        // Method 4: Last resort - Mediamister
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("yt-search failed, trying Mediamister...");
            result = await tryMediamister(cleanUrl);
        }
        
        if (!result || (!result.videos.length && !result.audios.length)) {
            throw new Error("No download options found for this video. The video might be private, age-restricted, or unavailable.");
        }
        
        return result;
        
    } catch (error) {
        console.error("YouTube Downloader Error:", error.message);
        throw error;
    }
}

// Helper function to validate YouTube URLs
function isValidYouTubeUrl(url) {
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?(youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?(youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?(youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

// Extract video ID from URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

// Method 1: Use cnvmp3 (best for direct downloads)
async function tryCnvmp3(youtubeUrl) {
    try {
        // Get video info
        const infoResult = await cnvmp3.info(youtubeUrl);
        
        if (!infoResult.success) {
            return null;
        }
        
        // Generate download options for different formats and qualities
        const videos = [];
        const audios = [];
        
        // Video qualities
        const videoQualities = [144, 360, 480, 720, 1080];
        for (const quality of videoQualities) {
            const videoResult = await cnvmp3.download({ 
                url: youtubeUrl, 
                fmt: 0, 
                quality: quality 
            }, 1, 1000); // Try once with short timeout
            
            if (videoResult.success && videoResult.result.dlink) {
                videos.push({
                    quality: `${quality}p MP4`,
                    url: videoResult.result.dlink,
                    format: videoResult.result.format,
                    size: 'Unknown',
                    type: 'video',
                    service: 'cnvmp3'
                });
            }
        }
        
        // Audio qualities
        const audioQualities = [96, 128, 160, 192, 256, 320];
        for (const quality of audioQualities) {
            const audioResult = await cnvmp3.download({ 
                url: youtubeUrl, 
                fmt: 1, 
                quality: quality 
            }, 1, 1000);
            
            if (audioResult.success && audioResult.result.dlink) {
                audios.push({
                    quality: `${quality}kbps MP3`,
                    url: audioResult.result.dlink,
                    format: audioResult.result.format,
                    size: 'Unknown',
                    type: 'audio',
                    service: 'cnvmp3'
                });
            }
        }
        
        // If no downloads succeeded, return null
        if (videos.length === 0 && audios.length === 0) {
            return null;
        }
        
        return {
            success: true,
            title: infoResult.result.title,
            thumbnail: infoResult.result.thumbnail || `https://i.ytimg.com/vi/${extractVideoId(youtubeUrl)}/maxresdefault.jpg`,
            duration: infoResult.result.duration || '0:00',
            videos: videos,
            audios: audios,
            service: 'cnvmp3'
        };
        
    } catch (error) {
        console.error("cnvmp3 error:", error.message);
        return null;
    }
}

// Method 2: Use youconvert
async function tryYouConvert(youtubeUrl) {
    try {
        const POST_URL = 'https://youtubemp4free.com/';
        const BASE_URL = 'https://youconvert.org/';
        const form = new FormData();
        form.append('action', 'yt_convert');
        form.append('youtube_url', youtubeUrl);
       
        const { data: repo } = await axios.post(POST_URL + 'wp-admin/admin-ajax.php', form, {
            headers: {
                ...form.getHeaders(),
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "accept": "*/*",
                "origin": "https://youconvert.org",
                "referer": "https://youconvert.org/"
            },
            timeout: 15000
        });
       
        if (!repo || !repo.data) {
            return null;
        }
        
        const v = repo.data;
        const i = repo.data?.info;
        const videoId = i?.video_id || extractVideoId(youtubeUrl);
        
        // Generate download options
        const videos = [];
        const audios = [];
        
        // Add MP4 download options
        if (v.mp4) {
            videos.push({
                quality: "MP4",
                url: v.mp4.startsWith('http') ? v.mp4 : BASE_URL + v.mp4.replace(/^\/+/, ''),
                format: "mp4",
                size: v.size || 'Unknown'
            });
        }
        
        // Add MP3 download options
        if (v.mp3) {
            audios.push({
                quality: "MP3",
                url: v.mp3.startsWith('http') ? v.mp3 : BASE_URL + v.mp3.replace(/^\/+/, ''),
                format: "mp3",
                size: v.size || 'Unknown'
            });
        }
        
        return {
            success: true,
            title: i?.title || "Unknown Title",
            thumbnail: i?.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            videos: videos,
            audios: audios,
            duration: i?.duration || '0:00',
            service: "youconvert"
        };
        
    } catch (error) {
        console.error("youconvert error:", error.message);
        return null;
    }
}

// Method 3: Use yt-search (for metadata)
async function tryYtSearch(videoId) {
    try {
        const video = await ytSearch({ videoId: videoId });
        
        if (!video || !video.videoId) {
            return null;
        }
        
        const thumbnails = video.thumbnails || {};
        const thumbnail = thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default;
        
        // Create download links
        const videos = [];
        const audios = [];
        
        // Add video quality options
        const videoQualities = ['360p', '480p', '720p', '1080p'];
        videoQualities.forEach(quality => {
            videos.push({
                quality: `${quality} MP4`,
                url: `https://youconvert.org/download/${videoId}/${quality}`,
                format: "mp4"
            });
        });
        
        // Add audio options
        const audioQualities = ['128kbps', '192kbps'];
        audioQualities.forEach(quality => {
            audios.push({
                quality: `${quality} MP3`,
                url: `https://youconvert.org/download/${videoId}/mp3/${quality}`,
                format: "mp3"
            });
        });
        
        return {
            success: true,
            title: video.title || "Unknown Title",
            thumbnail: thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            videos: videos,
            audios: audios,
            duration: video.duration?.toString() || "0:00",
            channel: video.author?.name || "Unknown Channel",
            views: video.views ? formatNumber(video.views) : 'Unknown',
            service: "yt-search"
        };
        
    } catch (error) {
        console.error("yt-search error:", error.message);
        return null;
    }
}

// Method 4: Try Mediamister
async function tryMediamister(youtubeUrl) {
    try {
        const videoId = extractVideoId(youtubeUrl);
        const postData = qs.stringify({
            url: youtubeUrl
        });

        const { data: html } = await axios.post(
            "https://www.mediamister.com/get_youtube_video",
            postData,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Accept": "*/*",
                    "X-Requested-With": "XMLHttpRequest",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://www.mediamister.com/youtube-video-downloader",
                    "Origin": "https://www.mediamister.com"
                },
                timeout: 10000
            }
        );

        const $ = cheerio.load(html);

        // Extract thumbnail
        const thumbnail = $(".yt_thumb img").attr("src") || 
                         $(".thumbnail img").attr("src") ||
                         `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
        
        // Extract title
        let title = $("h2").first().text().trim();
        if (!title) title = $(".title").text().trim();
        if (!title) title = "Unknown Title";

        // Extract videos
        const videos = [];
        $(".yt_format").each((index, formatElement) => {
            const formatText = $(formatElement).find("h3").text().toLowerCase();
            
            if (formatText.includes("video") || !formatText.includes("audio")) {
                $(formatElement).find("a.download-button").each((_, el) => {
                    const a = $(el);
                    const href = a.attr("href");
                    const text = a.text().replace(/\s+/g, " ").trim();
                    
                    if (href && text) {
                        videos.push({
                            quality: text,
                            url: href,
                            format: href.includes("webm") ? "webm" : "mp4"
                        });
                    }
                });
            }
        });

        // Extract audios
        const audios = [];
        $(".yt_format").each((index, formatElement) => {
            const formatText = $(formatElement).find("h3").text().toLowerCase();
            
            if (formatText.includes("audio")) {
                $(formatElement).find("a.download-button").each((_, el) => {
                    const a = $(el);
                    const href = a.attr("href");
                    const text = a.text().replace(/\s+/g, " ").trim();
                    
                    if (href && text) {
                        audios.push({
                            quality: text,
                            url: href,
                            format: href.includes("webm") ? "webm" : "m4a"
                        });
                    }
                });
            }
        });

        return {
            success: true,
            title,
            thumbnail,
            videos,
            audios,
            service: "mediamister"
        };
        
    } catch (error) {
        console.error("Mediamister error:", error.message);
        return null;
    }
}

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

module.exports = YeteeDeel;
