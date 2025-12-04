// Lib/Scrape_file/unrestrictedai.js
const axios = require('axios');
const cheerio = require('cheerio');

async function unrestrictedai(prompt, style = 'anime') {
  try {
    const styles = [
      'photorealistic',
      'digital-art',
      'impressionist',
      'anime',
      'fantasy',
      'sci-fi',
      'vintage'
    ];

    if (!prompt) throw new Error('Prompt is required.');
    if (!styles.includes(style)) {
      throw new Error(`Available styles: ${styles.join(', ')}.`);
    }

    const baseUrl = 'https://unrestrictedaiimagegenerator.com/';

    // Ambil halaman utama buat dapetin _wpnonce
    const { data: html } = await axios.get(baseUrl, {
      headers: {
        origin: baseUrl,
        referer: baseUrl,
        'user-agent':
          'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
      }
    });

    const $ = cheerio.load(html);
    const nonce = $('input[name="_wpnonce"]').attr('value');
    if (!nonce) throw new Error('Nonce not found.');

    // Kirim form generate image
    const body = new URLSearchParams({
      generate_image: 'true',
      image_description: prompt,
      image_style: style,
      _wpnonce: nonce
    }).toString();

    const { data } = await axios.post(baseUrl, body, {
      headers: {
        origin: baseUrl,
        referer: baseUrl,
        'user-agent':
          'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });

    // Parse hasil HTML balikan untuk ambil img
    const $$ = cheerio.load(data);
    let src = $$('img#resultImage').attr('src');
    if (!src) throw new Error('No result image found.');

    // Bikin absolute URL
    if (!/^https?:\/\//i.test(src)) {
      src = new URL(src, baseUrl).href;
    }

    return {
      success: true,
      prompt,
      style,
      image: src
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Scrape error'
    };
  }
}

module.exports = unrestrictedai;