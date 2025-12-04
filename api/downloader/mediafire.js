// api/mediafire.js
const src = scrape('downloader/mediafire');

let handler = async (res, req) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.reply(
        {
          success: false,
          error: 'Parameter url wajib diisi.'
        },
        { code: 400 }
      );
    }

    const data = await src(url);

    if (!data.status) {
      // scrapernya sendiri sudah kasih msg yang jelas
      return res.reply(
        {
          success: false,
          error: data.msg || 'Failed to fetch mediafire data.'
        },
        { code: 400 }
      );
    }

    return res.reply({
      success: true,
      name: data.name,
      size: data.size,
      date: data.date,
      type: data.type,
      continent: data.continent,
      flag: data.flag,
      location: data.location,
      downloadUrl: data.url,
      source: data.source
    });
  } catch (error) {
    console.error('Mediafire API Error:', error);

    const msg =
      typeof error === 'string'
        ? error
        : error?.message || JSON.stringify(error);

    return res.reply(
      {
        success: false,
        error: msg
      },
      { code: 500 }
    );
  }
};

handler.alias = 'Mediafire Downloader';
handler.category = 'Downloader';
handler.params = {
  url: {
    desc: 'Mediafire file URL',
    example: 'https://www.mediafire.com/file/xxxxxx/file-name.ext/file'
  }
};

module.exports = handler;