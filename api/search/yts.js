const yts = require("yt-search");

let handler = async (res, req) => {
    try {
        const { query, limit = 10 } = req.params;
        const debug = String(req?.query?.debug || '').trim() === '1';
        
        if (!query) {
            return res.reply({
                success: false,
                error: "Query parameter is required",
                message: "Please provide a search query"
            }, { code: 400 });
        }

        const searchResults = await yts({ query: query });
        let videos = searchResults.videos.slice(0, parseInt(limit) || 10);

        if (videos.length === 0) {
            return res.reply({
                success: false,
                error: "No results found",
                message: `No YouTube results found for "${query}"`
            }, { code: 404 });
        }

        const results = videos.map(video => ({
            title: video.title,
            url: video.url,
            videoId: video.videoId,
            channel: video.author?.name || 'Unknown Channel',
            thumbnail: video.thumbnail,
            duration: video.timestamp,
            views: video.views,
            uploaded: video.ago,
            description: video.description?.substring(0, 200) + (video.description?.length > 200 ? '...' : '') || 'No description'
        }));

        return res.reply({
            success: true,
            data: results,
            count: results.length,
            query: query
        });

    } catch (error) {
        console.error("YouTube Search Error:", error.message);
        
        const status = error?.response?.status || 500;
        
        return res.reply({
            success: false,
            error: "Search failed",
            message: error.message || "An error occurred while searching YouTube",
            ...(debug ? { detail: error.message } : {})
        }, { code: status });
    }
};

handler.alias = 'YouTube Search';
handler.category = 'Search';
handler.method = 'GET';
handler.params = {
    query: { 
        desc: 'Search query for YouTube videos', 
        required: true,
        type: 'string',
        example: 'Bohemian Rhapsody Queen'
    },
    limit: { 
        desc: 'Number of results to return (default: 10)', 
        required: false,
        type: 'number',
        example: 5
    }
};

module.exports = handler;
