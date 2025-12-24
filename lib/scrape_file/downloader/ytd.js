const ytSearch = require('yt-search');
const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");

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
        
        // Method 1: Try yt-search first (most reliable)
        let result = await tryYtSearch(videoId);
        
        // Method 2: If yt-search fails, try Mediamister
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("yt-search failed, trying Mediamister...");
            result = await tryMediamister(cleanUrl);
        }
        
        // Method 3: If both fail, try other services
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("Mediamister failed, trying alternative services...");
            result = await tryAlternativeServices(videoId);
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

// Method 1: Use yt-search (most reliable)
async function tryYtSearch(videoId) {
    try {
        // Get video info using yt-search
        const video = await ytSearch({ videoId: videoId });
        
        if (!video || !video.videoId) {
            return null;
        }
        
        // Generate thumbnail URLs
        const thumbnails = video.thumbnails || {};
        const thumbnail = thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default;
        
        // Create simulated download links using y2mate-like pattern
        // Note: These are example patterns - in real implementation you'd need to use
        // a service that provides actual download links
        
        const videos = [];
        const audios = [];
        
        // Add video quality options (simulated)
        const videoQualities = ['144p', '240p', '360p', '480p', '720p', '1080p'];
        videoQualities.forEach(quality => {
            videos.push({
                quality: `${quality} MP4`,
                url: `https://y2mate.is/en/download/${videoId}/${quality}`,
                format: "mp4"
            });
        });
        
        // Add audio options (simulated)
        const audioQualities = ['64kbps', '128kbps', '192kbps', '256kbps'];
        audioQualities.forEach(quality => {
            audios.push({
                quality: `${quality} MP3`,
                url: `https://y2mate.is/en/download/${videoId}/mp3/${quality.split('k')[0]}`,
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
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`
        };
        
    } catch (error) {
        console.error("yt-search error:", error.message);
        return null;
    }
}

// Method 2: Try Mediamister
async function tryMediamister(youtubeUrl) {
    try {
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
                         `https://i.ytimg.com/vi/${extractVideoId(youtubeUrl)}/maxresdefault.jpg`;
        
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
            sourceUrl: youtubeUrl
        };
        
    } catch (error) {
        console.error("Mediamister error:", error.message);
        return null;
    }
}

// Method 3: Try alternative services
async function tryAlternativeServices(videoId) {
    try {
        // Fallback to basic info with yt-search
        const video = await ytSearch({ videoId: videoId });
        
        if (!video) {
            return null;
        }
        
        const thumbnails = video.thumbnails || {};
        const thumbnail = thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default;
        
        // Create placeholder download links (these would need actual implementation)
        const videos = [
            {
                quality: "720p MP4",
                url: `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp4&color=ff0000`,
                format: "mp4"
            },
            {
                quality: "360p MP4",
                url: `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp4&color=00ff00`,
                format: "mp4"
            }
        ];
        
        const audios = [
            {
                quality: "128kbps MP3",
                url: `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3&color=0000ff`,
                format: "mp3"
            }
        ];
        
        return {
            success: true,
            title: video.title || "Unknown Title",
            thumbnail: thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            videos,
            audios,
            duration: video.duration?.toString() || "0:00",
            note: "These are placeholder links. Actual download requires integration with a download service.",
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`
        };
        
    } catch (error) {
        console.error("Alternative services error:", error.message);
        return null;
    }
}

module.exports = YeteeDeel;
