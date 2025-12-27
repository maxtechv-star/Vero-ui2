const ytSearch = require('yt-search');
const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const FormData = require('form-data');

// Ytmp4.is downloader function
async function ytmp4Download(videoId, format = "mp3") {
    try {
        const headers = {
            "accept-encoding": "gzip, deflate, br, zstd",
            "origin": "https://ht.flvto.online",
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        };
        
        const body = JSON.stringify({
            "id": videoId,
            "fileType": format
        });
        
        const response = await axios.post(`https://ht.flvto.online/converter`, body, {
            headers: headers,
            timeout: 30000
        });
        
        if (!response.data || response.data.status !== 'ok') {
            throw new Error(response.data?.msg || 'Download failed');
        }
        
        return response.data;
        
    } catch (error) {
        console.error("ytmp4.is error:", error.message);
        throw error;
    }
}

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
        
        // Method 1: Try youconvert first
        let result = await tryYouConvert(cleanUrl, videoId);
        
        // Method 2: Try ytmp4.is downloader
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("youconvert failed, trying ytmp4.is...");
            result = await tryYtmp4Is(videoId);
        }
        
        // Method 3: Try yt-search
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("ytmp4.is failed, trying yt-search...");
            result = await tryYtSearch(videoId);
        }
        
        // Method 4: Try Mediamister
        if (!result || (!result.videos.length && !result.audios.length)) {
            console.log("yt-search failed, trying Mediamister...");
            result = await tryMediamister(cleanUrl);
        }
        
        if (!result || (!result.videos.length && !result.audios.length)) {
            throw new Error("No download options found for this video.");
        }
        
        return result;
        
    } catch (error) {
        console.error("YouTube Downloader Error:", error.message);
        throw error;
    }
}

// New method for ytmp4.is
async function tryYtmp4Is(videoId) {
    try {
        // Get MP3 first (most common request)
        const mp3Data = await ytmp4Download(videoId, "mp3");
        
        // Try to get MP4
        let mp4Data = null;
        try {
            mp4Data = await ytmp4Download(videoId, "mp4");
        } catch (mp4Error) {
            console.log("MP4 not available:", mp4Error.message);
        }
        
        const videos = [];
        const audios = [];
        
        // Add MP3 audio
        if (mp3Data && mp3Data.link) {
            audios.push({
                quality: "MP3",
                url: mp3Data.link,
                format: "mp3",
                size: mp3Data.filesize ? formatBytes(mp3Data.filesize) : 'Unknown',
                duration: mp3Data.duration ? formatTime(mp3Data.duration) : 'Unknown',
                service: "ytmp4.is"
            });
        }
        
        // Add MP4 video
        if (mp4Data && mp4Data.link) {
            videos.push({
                quality: "MP4 (itag18)",
                url: mp4Data.link,
                format: "mp4",
                size: mp4Data.filesize ? formatBytes(mp4Data.filesize) : 'Unknown',
                duration: mp4Data.duration ? formatTime(mp4Data.duration) : 'Unknown',
                service: "ytmp4.is",
                note: "Video quality may vary (itag18)"
            });
        }
        
        // Get video info from yt-search for metadata
        let videoInfo = null;
        try {
            const video = await ytSearch({ videoId: videoId });
            videoInfo = video;
        } catch (infoError) {
            console.log("Failed to get video info:", infoError.message);
        }
        
        return {
            success: true,
            title: mp3Data?.title || videoInfo?.title || "Unknown Title",
            thumbnail: videoInfo?.thumbnails?.maxres?.url || 
                      videoInfo?.thumbnails?.high?.url || 
                      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            videos: videos,
            audios: audios,
            duration: mp3Data?.duration ? formatTime(mp3Data.duration) : 
                     videoInfo?.duration?.toString() || "Unknown",
            channel: videoInfo?.author?.name || "Unknown Channel",
            views: videoInfo?.views ? formatNumber(videoInfo.views) : 'Unknown',
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            service: "ytmp4.is",
            note: "Supports long videos (up to 24 hours). MP4 uses itag18 quality."
        };
        
    } catch (error) {
        console.error("ytmp4.is processing error:", error.message);
        return null;
    }
}

// Keep all other existing functions (isValidYouTubeUrl, extractVideoId, tryYouConvert, tryYtSearch, tryMediamister, helper functions)
// ... [ALL THE EXISTING FUNCTIONS REMAIN THE SAME] ...

// Add new helper function to format time
function formatTime(seconds) {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format numbers
function formatNumber(num) {
    if (!num) return '0';
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

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = YeteeDeel;
