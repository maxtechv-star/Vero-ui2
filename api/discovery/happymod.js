const axios = require("axios");
const cheerio = require("cheerio");

async function happyModSearch(query = "") {
  try {
    if (!query) {
      throw new Error("Query parameter is required");
    }

    const url = `https://id.happymod.cloud/search.html?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive"
      },
      timeout: 30000
    });

    const $ = cheerio.load(res.data);
    const results = [];

    $("li.list-item").each((i, el) => {
      const box = $(el).find("a.list-box");
      const title = box.find(".list-info-title").text().trim();
      const link = box.attr("href");
      
      if (!title || !link) return;

      const downloadPage = `https://id.happymod.cloud${link}original-downloading.html`;
      const packageName = link.split("/")[2] || null;
      const version = box.find(".list-info-text").first().find("span").eq(0).text().trim();
      const size = box.find(".list-info-text").first().find("span").eq(2).text().trim();
      const modInfo = box.find(".list-info-text").eq(1).text().trim();
      const icon = box.find(".list-img img").attr("src");

      results.push({
        title,
        package: packageName,
        version: version || "Unknown",
        size: size || "Unknown",
        modInfo: modInfo || "No mod information",
        downloadPage: downloadPage,
        icon: icon ? `https://id.happymod.cloud${icon}` : null,
        category: "modded-app"
      });
    });

    return {
      success: true,
      query: query,
      totalResults: results.length,
      results: results
    };

  } catch (err) {
    throw new Error(`Failed to search HappyMod: ${err.message}`);
  }
}

const handler = async (res, req) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.reply({
        message: "Query parameter is required",
        usage: "Search for modded apps on HappyMod",
        example: "/discovery/happymod?query=kinemaster",
        parameters: {
          query: "App name to search for (e.g., kinemaster, whatsapp, tiktok)"
        }
      }, { code: 400 });
    }

    // Perform search
    const searchResults = await happyModSearch(query);

    if (searchResults.totalResults === 0) {
      return res.reply({
        message: "No results found",
        query: query,
        suggestion: "Try a different search term or check the spelling"
      }, { code: 404 });
    }

    res.reply(searchResults);
    
  } catch (error) {
    console.error('HappyMod Search Error:', error);
    res.reply({
      message: "Failed to search HappyMod",
      error: error.message,
      suggestion: "Try again later or use a different search term"
    }, { code: 500 });
  }
};

// API Configuration
handler.alias = 'HappyMod Search';
handler.category = 'Discovery';
handler.status = 'ready';
handler.method = 'GET';
handler.params = {
  query: {
    desc: 'App name to search for on HappyMod',
    required: true,
    type: 'string',
    example: 'kinemaster'
  }
};

module.exports = handler;
