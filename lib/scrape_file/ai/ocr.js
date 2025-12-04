// ai/ocr.js
const axios = require('axios');

class OCR {
    ocr = async function (imageUrl) {
        try {
            if (!imageUrl) throw new Error('imageUrl is required.');
            if (!/^https?:\/\//.test(imageUrl)) throw new Error('Invalid image URL.');

            const apiUrl = `https://anabot.my.id/api/tools/ocr?imageUrl=${encodeURIComponent(imageUrl)}&apikey=freeApikey`;

            const { data } = await axios.get(apiUrl, {
                headers: { accept: '*/*' }
            });

            if (!data.success) {
                throw new Error('OCR gagal: ' + JSON.stringify(data));
            }

            return {
                success: true,
                imageUrl,
                extractedText: data.data?.result || ''
            };

        } catch (error) {
            return {
                success: false,
                error: error.message || 'Unknown error'
            };
        }
    }
}

module.exports = new OCR();