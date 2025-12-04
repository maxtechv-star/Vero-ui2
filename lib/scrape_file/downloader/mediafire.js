// downloader/mediafire.js
const cheerio = require('cheerio');

// kalau environment-mu belum ada global fetch:
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function downloadMediafire(link) {
  try {
    if (!link) throw new Error('Mediafire URL is required.');

    const f = await fetch(link, {
      headers: {
        'accept-encoding': 'gzip, deflate, br, zstd',
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
      }
    });

    if (!f.ok) {
      throw new Error(
        `There was an error on the website (HTTP ${f.status} ${f.statusText})`
      );
    }

    const t = await f.text();
    const $ = cheerio.load(t);

    const url = $('.input.popsok').attr('href');

    if (!url || !/\/\/download\d+\.mediafire\.com\//.test(url)) {
      throw new Error('Failed to find download url on the web');
    }

    const name = $('.intro .filename').text().trim();
    const date = $('.details li:nth-child(2) span').text().trim();
    const size = $('.details li:nth-child(1) span').text().trim();
    const type = $('.intro .filetype').text().trim();

    const cont = {
      af: 'Africa',
      an: 'Antarctica',
      as: 'Asia',
      eu: 'Europe',
      na: 'North America',
      oc: 'Oceania',
      sa: 'South America'
    };

    const $lo = $('.DLExtraInfo-uploadLocation');

    const continentRaw =
      $lo.find('.DLExtraInfo-uploadLocationRegion').attr('data-lazyclass') ||
      '';
    const continentCode = continentRaw.replace('continent-', '').trim();

    const locationMatch = $lo
      .find('.DLExtraInfo-sectionDetails p')
      .text()
      .match(/from (.*?) on/);

    const location = locationMatch ? locationMatch[1].trim() : null;

    const flagRaw = $lo.find('.flag').attr('data-lazyclass') || '';
    const flag = flagRaw.replace('flag-', '').trim() || null;

    return {
      status: true,
      source: link,
      name: name || null,
      size: size || null,
      date: date || null,
      type: type || null,
      continent: cont[continentCode] || 'Unknown',
      flag,
      location,
      url
    };
  } catch (e) {
    return {
      status: false,
      msg: e.message || String(e)
    };
  }
}

// default export buat dipanggil via scrape('downloader/mediafire')
module.exports = async (link) => downloadMediafire(link);