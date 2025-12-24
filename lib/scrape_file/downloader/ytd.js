const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");

async function YeteeDeel(youtubeUrl) {
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
                    "Referer": "https://www.mediamister.com/youtube-video-downloader"
                },
                timeout: 30000
            }
        );

        const $ = cheerio.load(html);

        // Extract thumbnail
        const thumbnail = $(".yt_thumb img").attr("src") || null;
        
        // Extract title (try multiple selectors)
        let title = $("h2").first().text().trim();
        if (!title) {
            title = $(".title").text().trim();
        }
        if (!title) {
            title = "Unknown Title";
        }

        // Extract video download options
        const videos = [];
        $(".yt_format").each((index, formatElement) => {
            const formatText = $(formatElement).find("h3").text().toLowerCase();
            
            if (formatText.includes("video")) {
                $(formatElement).find("a.download-button").each((_, el) => {
                    const a = $(el);
                    const href = a.attr("href");
                    const text = a.text().replace(/\s+/g, " ").trim();
                    
                    if (href && text) {
                        videos.push({
                            quality: text,
                            url: href,
                            format: href.includes("mime=video/webm") ? "webm" : "mp4"
                        });
                    }
                });
            }
        });

        // Extract audio download options
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
                            format: href.includes("mime=audio/webm") ? "webm" : "m4a"
                        });
                    }
                });
            }
        });

        // Fallback: if no specific format sections found, try to find all download buttons
        if (videos.length === 0 && audios.length === 0) {
            $("a.download-button").each((_, el) => {
                const a = $(el);
                const href = a.attr("href");
                const text = a.text().replace(/\s+/g, " ").trim();
                
                if (href && text) {
                    const isAudio = text.toLowerCase().includes("audio") || 
                                   href.includes("mime=audio") ||
                                   text.toLowerCase().includes("mp3");
                    
                    if (isAudio) {
                        audios.push({
                            quality: text,
                            url: href,
                            format: href.includes("webm") ? "webm" : "m4a"
                        });
                    } else {
                        videos.push({
                            quality: text,
                            url: href,
                            format: href.includes("webm") ? "webm" : "mp4"
                        });
                    }
                }
            });
        }

        return {
            success: true,
            title,
            thumbnail,
            videos,
            audios,
            sourceUrl: youtubeUrl
        };
        
    } catch (error) {
        console.error("YouTube Downloader Error:", error.message);
        
        // Provide a more helpful error message
        if (error.code === 'ECONNABORTED') {
            throw new Error("Request timeout. The service might be busy. Please try again.");
        } else if (error.response) {
            throw new Error(`Service responded with status ${error.response.status}. Please try a different video.`);
        } else {
            throw new Error(`Failed to fetch video information: ${error.message}`);
        }
    }
}

module.exports = YeteeDeel;
