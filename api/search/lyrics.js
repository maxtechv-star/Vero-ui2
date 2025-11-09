
const axios = require('axios');

let handler = async (res, req) => {
    try {
        const { query } = req.params;
        const debug = String(req?.query?.debug || '').trim() === '1';
        
        if (!query) {
            return res.reply(
                JSON.stringify({
                    success: false,
                    error: "Query parameter is required",
                    message: "Please provide a song title or artist"
                }),
                { code: 400 }
            );
        }

        const response = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
            headers: {
                referer: `https://lrclib.net/search/${encodeURIComponent(query)}`,
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
            },
            timeout: 10000
        });

        const data = response.data;

        if (!data || !data[0]) {
            return res.reply(
                JSON.stringify({
                    success: false,
                    error: "No lyrics found",
                    message: `No lyrics found for "${query}"`
                }),
                { code: 404 }
            );
        }

        let song = data[0];

        let track = song.trackName || 'Unknown Track';
        let artist = song.artistName || 'Unknown Artist';
        let album = song.albumName || 'Unknown Album';
        let duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'Unknown Duration';

        let plainLyrics = song.plainLyrics;
        let syncedLyrics = song.syncedLyrics;

        let lyrics = plainLyrics;
        if (!lyrics && syncedLyrics) {
            lyrics = syncedLyrics.replace(/\[.*?\]/g, '').trim();
        }
        
        if (!lyrics) {
            lyrics = 'No lyrics available';
        }

        const result = {
            track: track,
            artist: artist,
            album: album,
            duration: duration,
            lyrics: lyrics,
            hasSyncedLyrics: !!syncedLyrics,
            source: 'lrclib.net'
        };

        return res.reply({
            success: true,
            data: result,
            query: query
        });

    } catch (error) {
        console.error("Lyrics Search Error:", error.message);
        
        const status = error?.response?.status || 500;
        const detail = error.message || String(error);
        
        return res.reply(
            JSON.stringify({
                success: false,
                error: "Lyrics search failed",
                message: error.message || "An error occurred while searching for lyrics",
                ...(debug ? { detail } : {})
            }),
            { code: status }
        );
    }
};

handler.alias = 'Lyrics Search';
handler.category = 'search';
handler.method = 'GET';
handler.params = {
    query: { 
        desc: 'Song title or artist name to search for lyrics', 
        required: true,
        type: 'string',
        example: 'Bohemian Rhapsody Queen'
    }
};

module.exports = handler;
