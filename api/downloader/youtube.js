const yts = require("yt-search");

const yt = {
    url: Object.freeze({
        audio128: 'https://api.apiapi.lat',
        video: 'https://api5.apiapi.lat',
        else: 'https://api3.apiapi.lat',
        referrer: 'https://ogmp3.pro/'
    }),
    encUrl: s => s.split('').map(c => c.charCodeAt()).reverse().join(';'),
    xor: s => s.split('').map(v => String.fromCharCode(v.charCodeAt() ^ 1)).join(''),
    genRandomHex: () => Array.from({ length: 32 }, _ => "0123456789abcdef"[Math.floor(Math.random()*16)]).join(""),
    init: async function (rpObj) {
        const { apiOrigin, payload } = rpObj
        const api = apiOrigin + "/" + this.genRandomHex() + "/init/" + this.encUrl(this.xor(payload.data)) + "/" + this.genRandomHex() + "/"
        const r = await fetch(api, { method: "post", body: JSON.stringify(payload) })
        if (!r.ok) throw Error(await r.text())
        return r.json()
    },
    genFileUrl: function (i, pk, rpObj) {
        const { apiOrigin } = rpObj
        const pkValue = pk ? pk + "/" : ""
        const downloadUrl = apiOrigin + "/" + this.genRandomHex() + "/download/" + i + "/" + this.genRandomHex() + "/" + pkValue
        return { downloadUrl }
    },
    statusCheck: async function (i, pk, rpObj) {
        const { apiOrigin } = rpObj
        let json
        let count = 0
        do {
            await new Promise(r => setTimeout(r, 5000))
            count++
            const pkVal = pk ? pk + "/" : ""
            const api = apiOrigin + "/" + this.genRandomHex() + "/status/" + i + "/" + this.genRandomHex() + "/" + pkVal
            const r = await fetch(api, {
                method: "post",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: i })
            })
            if (!r.ok) throw Error(await r.text())
            json = await r.json()
            if (count >= 100) throw Error("pooling mencapai 100, dihentikan")
        } while (json.s === "P")
        if (json.s === "E") throw Error(JSON.stringify(json))
        return this.genFileUrl(i, pk, rpObj)
    },
    resolvePayload: function (ytUrl, userFormat) {
        const valid = ["64k","96k","128k","192k","256k","320k","240p","360p","480p","720p","1080p"]
        if (!valid.includes(userFormat)) throw Error(`format salah. tersedia: ${valid.join(", ")}`)
        let apiOrigin = this.url.audio128
        let data = this.xor(ytUrl)
        let referer = this.url.referrer
        let format = "0"
        let mp3Quality = "128"
        let mp4Quality = "720"
        if (/^\d+p$/.test(userFormat)) {
            apiOrigin = this.url.video
            format = "1"
            mp4Quality = userFormat.replace("p","")
        } else if (userFormat !== "128k") {
            apiOrigin = this.url.else
            mp3Quality = userFormat.replace("k","")
        }
        return {
            apiOrigin,
            payload: {
                data,
                format,
                referer,
                mp3Quality,
                mp4Quality,
                userTimeZone: "-480"
            }
        }
    },
    download: async function (url, fmt = "128k") {
        const rpObj = this.resolvePayload(url, fmt)
        const initObj = await this.init(rpObj)
        const { i, pk, s } = initObj
        if (s === "C") return this.genFileUrl(i, pk, rpObj)
        return this.statusCheck(i, pk, rpObj)
    }
};

const handler = async (res, req) => {
    try {
        const { query, format = "128k" } = req.query;
        
        if (!query) {
            return res.reply({
                message: "Query parameter is required",
                usage: "Send a search query to find YouTube videos"
            }, { code: 400 });
        }

        // Search for videos
        const searchResults = await yts(query);
        
        if (!searchResults.videos || searchResults.videos.length === 0) {
            return res.reply({
                message: "No videos found for the given query",
                query: query
            }, { code: 404 });
        }

        const video = searchResults.videos[0];
        
        // Get download URL
        const downloadInfo = await yt.download(video.url, format);
        
        const result = {
            success: true,
            video: {
                title: video.title,
                description: video.description,
                duration: video.duration.toString(),
                timestamp: video.timestamp,
                views: video.views,
                thumbnail: video.thumbnail,
                author: {
                    name: video.author.name,
                    url: video.author.url
                },
                url: video.url,
                uploaded: video.ago
            },
            download: {
                format: format,
                downloadUrl: downloadInfo.downloadUrl,
                type: format.includes('k') ? 'audio' : 'video',
                quality: format
            }
        };

        res.reply(result);
        
    } catch (error) {
        console.error('YouTube Download Error:', error);
        res.reply({
            message: "Failed to process YouTube download",
            error: error.message
        }, { code: 500 });
    }
};

// API Configuration
handler.alias = 'YouTube Downloader';
handler.category = 'Downloader';
handler.status = 'ready';
handler.method = 'GET';
handler.params = {
    query: {
        desc: 'Search query or YouTube URL',
        required: true,
        example: 'never gonna give you up',
        type: 'string'
    },
    format: {
        desc: 'Download format quality',
        required: false,
        type: 'string',
        options: ['64k', '96k', '128k', '192k', '256k', '320k', '240p', '360p', '480p', '720p', '1080p'],
        example: '128k'
    }
};

module.exports = handler;
