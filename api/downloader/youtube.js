
const axios = require('axios');

const yt = {
    get url() {
        return {
            origin: 'https://ytmp3.cx'
        }
    },

    get baseHeaders() {
        return {
            'accept-encoding': 'gzip, deflate, br, zstd',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    },

    extractVideoId: function (fV) {
        let v
        if (fV.indexOf('youtu.be') > -1) {
            v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV)
        } else if (fV.indexOf('youtube.com') > -1) {
            if (fV.indexOf('/shorts/') > -1) {
                v = /\/([a-zA-Z0-9\-\_]{11})/.exec(fV)
            } else {
                v = /v=([a-zA-Z0-9\-\_]{11})/.exec(fV)
            }
        }
        const result = v?.[1]
        if (!result) throw Error(`Failed to extract video ID from: ${fV}`)
        return result
    },

    getInitUrl: async function () {
        try {
            // First request to get the main page
            const r1 = await axios.get(this.url.origin, { 
                headers: this.baseHeaders,
                timeout: 10000
            })
            
            const html = r1.data
            
            // Extract JavaScript file path
            const jsPathMatch = html.match(/<script src="(\/js\/app\.[^"]+\.js)"/)
            if (!jsPathMatch) {
                throw new Error('Could not find JavaScript file path')
            }
            
            const jsPath = jsPathMatch[1]
            const jsUrl = this.url.origin + jsPath
            
            // Fetch the JavaScript file
            const r2 = await axios.get(jsUrl, { 
                headers: {
                    ...this.baseHeaders,
                    'Referer': this.url.origin
                },
                timeout: 10000
            })
            
            const js = r2.data
            
            // Try to find API URL in JavaScript
            const apiUrlMatches = js.match(/convertURL:"([^"]+)"/)
            if (apiUrlMatches && apiUrlMatches[1]) {
                return apiUrlMatches[1]
            }
            
            // Alternative pattern matching
            const altMatches = js.match(/apiUrl:\s*["']([^"']+)["']/)
            if (altMatches && altMatches[1]) {
                return altMatches[1]
            }
            
            throw new Error('Could not extract API URL from JavaScript')
            
        } catch (error) {
            console.error('getInitUrl error:', error.message)
            throw new Error(`Failed to get API URL: ${error.message}`)
        }
    },

    download: async function (url, f = 'mp4') {
        if (!/^mp3|mp4$/.test(f)) throw Error(`Format must be mp3 or mp4`)
        
        const v = this.extractVideoId(url)
        const headers = {
            'referer': this.url.origin,
            ...this.baseHeaders,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*'
        }
        
        try {
            const initApi = await this.getInitUrl()
            console.log('Found API URL:', initApi)
            
            // First request to initialize conversion
            const r1 = await axios.get(initApi, { headers, timeout: 15000 })
            const j1 = r1.data
            
            const { convertURL } = j1
            
            if (!convertURL) {
                throw new Error('No convertURL found in API response')
            }
            
            // Build conversion URL
            const convertApi = `${convertURL}&v=${v}&f=${f}&_=${Date.now()}`
            console.log('Conversion URL:', convertApi)
            
            const r2 = await axios.get(convertApi, { headers, timeout: 15000 })
            const j2 = r2.data
            
            if (j2.error) {
                throw new Error(`API Error: ${j2.error}`)
            }
            
            if (j2.redirectURL) {
                // Direct download available
                const r3 = await axios.get(j2.redirectURL, { headers, timeout: 15000 })
                const j3 = r3.data
                
                return {
                    title: j3.title || 'Unknown Title',
                    downloadURL: j3.downloadURL,
                    format: f,
                    videoId: v,
                    duration: j3.duration,
                    quality: j3.quality
                }
            } else if (j2.progressURL) {
                // Need to wait for conversion
                let attempts = 0
                const maxAttempts = 15 // Increased attempts
                
                while (attempts < maxAttempts) {
                    const r3 = await axios.get(j2.progressURL, { headers, timeout: 15000 })
                    const progressData = r3.data
                    
                    if (progressData.error) {
                        throw new Error(`Progress error: ${progressData.error}`)
                    }
                    
                    if (progressData.progress === 3) { // 3 typically means completed
                        return {
                            title: progressData.title || 'Unknown Title',
                            downloadURL: j2.downloadURL,
                            format: f,
                            videoId: v,
                            duration: progressData.duration,
                            quality: progressData.quality
                        }
                    }
                    
                    attempts++
                    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
                }
                
                throw new Error('Conversion timeout - please try again later')
            } else {
                throw new Error('Unexpected API response format')
            }
            
        } catch (error) {
            console.error('Download error:', error.message)
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout - service might be busy')
            }
            throw error
        }
    }
}

let handler = async (res, req) => {
    try {
        const { url, format = 'mp4' } = req.query;
        
        if (!url) return res.reply('URL parameter is required.', { code: 400 });
        if (!/youtube\.com|youtu\.be/.test(url)) return res.reply('Invalid YouTube URL.', { code: 400 });
        if (!['mp3', 'mp4'].includes(format)) return res.reply('Format must be mp3 or mp4.', { code: 400 });
        
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
            message: `Successfully processed YouTube video as ${format.toUpperCase()}`
        };
        
        res.reply(response);
    } catch (error) {
        console.error("YouTube Download Error:", error.message);
        res.reply({
            status: false,
            error: "Download failed",
            message: error.message || "An error occurred while processing the video",
            suggestion: "Please try again with a different video or check if the video is available"
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
