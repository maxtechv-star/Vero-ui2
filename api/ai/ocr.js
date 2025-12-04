const src = scrape('ai/ocr');

let handler = async (res, req) => {
    try {
        const { imageUrl } = req.query;

        if (!imageUrl) {
            return res.reply(
                { success: false, error: 'imageUrl wajib.' },
                { code: 400 }
            );
        }

        const result = await src.ocr(imageUrl);

        res.reply(result);

    } catch (error) {
        res.reply(
            { success: false, error: error.message },
            { code: 500 }
        );
    }
};

handler.alias = 'OCR';
handler.category = 'AI';
handler.params = {
    imageUrl: { 
        desc: 'URL gambar untuk OCR',
        example: 'https://tmpfiles.org/xxx.jpg'
    }
};

module.exports = handler;