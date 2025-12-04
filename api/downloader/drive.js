// api/drivedl.js
const src = scrape('downloader/drivedl'); // sesuaikan path module scrape di project-mu

let handler = async (res, req) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.reply(
        { success: false, error: 'Parameter url wajib diisi.' },
        { code: 400 }
      );
    }

    const data = await src(url);

    return res.reply({
      success: true,
      ...data
    });
  } catch (error) {
    console.error('DriveDL Error:', error);

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

handler.alias = 'Google Drive Downloader';
handler.category = 'Downloader';
handler.params = {
  url: {
    desc: 'Google Drive URL atau File ID',
    example: 'https://drive.google.com/file/d/17mxxaGb9a-59seWu0BTY0Se3uM-aW2ZZ/view?usp=drivesdk'
  }
};

module.exports = handler;