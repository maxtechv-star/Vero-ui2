const axios = require('axios');

async function spotifyDownload(input) {
    try {
        if (!input) throw new Error('Input is required.');
        
        // Get song details
        const { data: songData } = await axios.get(`https://spotdown.org/api/song-details?url=${encodeURIComponent(input)}`, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            timeout: 30000
        });
        
        const song = songData.songs[0];
        if (!song) throw new Error('Track not found.');
        
        // Download the audio
        const { data: audioBuffer, headers } = await axios.post('https://spotdown.org/api/download', {
            url: song.url
        }, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            responseType: 'arraybuffer',
            timeout: 60000
        });
        
        return {
            success: true,
            metadata: {
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                cover: song.thumbnail,
                url: song.url,
                spotifyUrl: input.includes('spotify.com') ? input : null
            },
            audio: {
                buffer: audioBuffer,
                size: headers['content-length'] || audioBuffer.length,
                contentType: headers['content-type'] || 'audio/mpeg',
                filename: `${song.title} - ${song.artist}.mp3`.replace(/[<>:"/\\|?*]/g, '_')
            }
        };
    } catch (error) {
        throw new Error(`Spotify download failed: ${error.message}`);
    }
}

const handler = async (res, req) => {
    try {
        const { query, url, type = 'json' } = req.query;
        
        if (!query && !url) {
            return res.reply({
                message: "Query or URL parameter is required",
                usage: "Search for a song or provide a Spotify URL",
                examples: {
                    search: "/downloader/spotify?query=tek it",
                    url: "/downloader/spotify?url=https://open.spotify.com/track/0MnTkIEP4zZN1IUSu8MvIz",
                    download_audio: "/downloader/spotify?query=tek it&type=audio"
                }
            }, { code: 400 });
        }

        const input = url || query;
        
        // Perform download
        const result = await spotifyDownload(input);

        // Return audio buffer directly if requested
        if (type === 'audio') {
            return res.sendBuffer(result.audio.buffer, {
                contentType: result.audio.contentType,
                filename: result.audio.filename
            });
        }

        // Return JSON response with metadata
        res.reply({
            success: true,
            input: input,
            metadata: result.metadata,
            downloadInfo: {
                size: result.audio.size,
                format: 'MP3',
                quality: 'Standard',
                directDownload: `/downloader/spotify?url=${encodeURIComponent(input)}&type=audio`
            }
        });
        
    } catch (error) {
        console.error('Spotify Download Error:', error);
        res.reply({
            message: "Failed to download from Spotify",
            error: error.message,
            suggestion: "Check if the track URL is valid or try a different search term"
        }, { code: 500 });
    }
};

// API Configuration
handler.alias = 'Spotify Downloader';
handler.category = 'Downloader';
handler.status = 'ready';
handler.method = 'GET';
handler.params = {
    query: {
        desc: 'Song name to search for',
        required: false,
        type: 'string',
        example: 'tek it'
    },
    url: {
        desc: 'Direct Spotify track URL',
        required: false,
        type: 'string',
        example: 'https://open.spotify.com/track/0MnTkIEP4zZN1IUSu8MvIz'
    },
    type: {
        desc: 'Response type',
        required: false,
        type: 'string',
        options: ['json', 'audio'],
        example: 'json',
        default: 'json'
    }
};

module.exports = handler;
