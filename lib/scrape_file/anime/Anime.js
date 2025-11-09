// lib/scrape_file/anime/Anime.js
const cheerio = require("cheerio");
const axios = require("axios");

async function Anime(query) {
  try {
    const { data } = await axios.get(
      "https://myanimelist.net/anime.php?q=" + encodeURIComponent(query) + "&catanime"
    );

    const $ = cheerio.load(data);
    const results = [];

    $("div.js-categories-seasonal > table").each((_, el) => {
      for (let i = 1; i <= 10; i++) {
        const b = $(el).find("td.borderClass > div.title")[i];
        const c = $(el).find("td.borderClass > div.picSurround > a.hoverinfo_trigger")[i];
        const d = $(el).find("td.ac:nth-child(3)")[i];
        const e = $(el).find("td.ac:nth-child(4)")[i];
        const f = $(el).find("td.ac:nth-child(5)")[i];
        const url = $(b).find("a.hoverinfo_trigger").attr("href");

        if (!url) continue;

        results.push({
          title: $(b).find("a.hoverinfo_trigger").text().trim(),
          thumbnail: $(c).find("img").attr("data-src") || $(c).find("img").attr("src"),
          url,
          type: $(d).text().trim(),
          episode: $(e).text().trim(),
          score: $(f).text().trim(),
        });
      }
    });

    if (!results.length) return { success: false, message: "No result found." };
    return { success: true, result: results };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = Anime;
