const axios = require('axios');
const cheerio = require('cheerio');

class Dafont {
    search = async function (q) {
        try {
            if (!q) throw new Error('Query is required.');
            
            const { data: html } = await axios.get(`https://www.dafont.com/search.php?q=${q}`);
            const $ = cheerio.load(html);
            const results = [];
            
            const regex = /<div class="lv1left dfbg">.*?<span class="highlight">(.*?)<\/span>.*?by <a href="(.*?)">(.*?)<\/a>.*?<\/div>.*?<div class="lv1right dfbg">.*?<a href="(.*?)">(.*?)<\/a>.*?>(.*?)<\/a>.*?<\/div>.*?<div class="lv2right">.*?<span class="light">(.*?)<\/span>.*?<\/div>.*?<div style="background-image:url\((.*?)\)" class="preview">.*?<a href="(.*?)">/g;
            
            let match;
            while ((match = regex.exec(html)) !== null) {
                const [, title, authorLink, author, , theme, , totalDownloads, previewImage, url] = match;
                
                results.push({
                    title: title.trim() || 'Unknown',
                    author: {
                        name: author.trim() || 'Unknown',
                        link: `https://www.dafont.com/${authorLink.trim()}` || 'Unknown',
                    },
                    theme: theme.trim() || 'Unknown',
                    totalDownloads: totalDownloads.trim().replace(/[^0-9]/g, '') || 'Unknown',
                    previewImage: `https://www.dafont.com${previewImage.trim()}` || 'Unknown',
                    url: `https://www.dafont.com/${url.trim()}` || 'Unknown'
                });
            }
            
            return results;
        } catch (error) {
            throw new Error(error.message || 'No result found.');
        }
    }
    
    detail = async function (url) {
        try {
            if (!url || !url.includes('www.dafont.com')) throw new Error('Invalid url.');
            
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            
            const getValue = (selector) => $(selector).text().trim();
            const getFilenames = () => $('.filename').toArray().map(element => $(element).text().trim());
            const getImage = () => 'https://www.dafont.com' + $('.preview').css('background-image').replace(/^url\(["']?|['"]?\)$/g, '');
            const getDownloadLink = () => $('a.dl').attr('href') ? 'http:' + $('a.dl').attr('href') : '';
            
            return {
                title: getValue('.lv1left.dfbg strong'),
                author: getValue('.lv1left.dfbg a'),
                theme: getValue('.lv1right.dfbg a:last-child'),
                totalDownloads: getValue('.lv2right .light').replace(/\D/g, ''),
                filename: getFilenames(),
                image: getImage(),
                note: $('[style^="border-left"]').text().trim(),
                downloadUrl: getDownloadLink(),
            };
        } catch (error) {
            throw new Error(error.message || 'No result found.');
        }
    }
}

module.exports = new Dafont();
