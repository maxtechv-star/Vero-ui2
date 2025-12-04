const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function fbdl(url) {
  try {
    // follow redirect (penting untuk share/v/)
    const get = await axios.get(url, {
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
      },
    });

    const finalURL = get.request.res.responseUrl || url;

    const mBasic = finalURL.replace(
      "www.facebook.com",
      "mbasic.facebook.com"
    );

    const html = (await axios.get(mBasic)).data;
    const $ = cheerio.load(html);

    let hd = null;
    let sd = null;

    $("a").each((i, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("video_redirect")) {
        const real = decodeURIComponent(href.split("src=")[1] || "");

        if (real.includes("hd")) hd = real;
        else sd = real;
      }
    });

    return {
      success: true,
      hd: hd || null,
      sd: sd || null,
      final_url: finalURL,
    };
  } catch (e) {
    return {
      success: false,
      message: e.message || String(e),
    };
  }
};