const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const mime = require('mime-types');

async function mediafire(url) {
    try {
        const response = await axios.get(url.trim(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract title
        const title = $("meta[property='og:title']").attr("content")?.trim() || 
                     $("meta[name='twitter:title']").attr("content")?.trim() || 
                     "Unknown";
        
        // Extract file size
        const sizeMatch = /Download\s*\(([\d.]+\s*[KMGT]?B)\)/i.exec($.html());
        const size = sizeMatch?.[1] || "Unknown";
        
        // Extract download URL
        let downloadUrl = $("a.popsok[href^='https://download']").attr("href")?.trim() || 
                         $("a.popsok:not([href^='javascript'])").attr("href")?.trim() ||
                         $("a#downloadButton").attr("href")?.trim() ||
                         $("a.downloadBtn").attr("href")?.trim();
        
        if (!downloadUrl) {
            // Alternative method: look for download links in scripts
            const scriptContent = $('script').toString();
            const downloadRegex = /(https:\/\/download[0-9]*\.mediafire\.com\/[^"']*)/g;
            const matches = scriptContent.match(downloadRegex);
            if (matches && matches.length > 0) {
                downloadUrl = matches[0];
            }
        }
        
        if (!downloadUrl) {
            throw new Error("Download URL not found.");
        }
        
        // Ensure download URL is absolute
        if (downloadUrl.startsWith('//')) {
            downloadUrl = 'https:' + downloadUrl;
        } else if (downloadUrl.startsWith('/')) {
            downloadUrl = 'https://www.mediafire.com' + downloadUrl;
        }
        
        const filename = path.basename(downloadUrl);
        const fileType = path.extname(downloadUrl);
        const mimetype = mime.lookup(filename) || 'application/octet-stream';
        
        return { 
            name: title, 
            filename: filename,
            type: fileType,
            size: size,
            download: downloadUrl,
            mimetype: mimetype,
            link: url.trim() 
        };
    } catch (error) {
        throw new Error(`MediaFire parsing failed: ${error.message}`);
    }
}

let handler = async (res, req) => {
    try {
        const { url, type = 'info' } = req.params;
        const debug = String(req?.query?.debug || '').trim() === '1';
        
        if (!url) {
            return res.reply({
                success: false,
                error: "URL parameter is required",
                message: "Please provide a MediaFire URL"
            }, { code: 400 });
        }

        // Validate MediaFire URL
        const mediafireRegex = /^https?:\/\/(www\.)?mediafire\.com\/.+/i;
        if (!mediafireRegex.test(url)) {
            return res.reply({
                success: false,
                error: "Invalid MediaFire URL",
                message: "Please provide a valid MediaFire URL"
            }, { code: 400 });
        }

        console.log(`[MediaFire] Processing: ${url}`);
        
        const data = await mediafire(url);
        
        if (type === 'info' || type === 'json') {
            // Return file information only
            return res.reply({
                success: true,
                provider: 'mediafire.com',
                data: data,
                message: "MediaFire file information retrieved successfully"
            });
        } else if (type === 'download' || type === 'file') {
            // Download and return the actual file
            try {
                const fileResponse = await axios.get(data.download, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Referer': 'https://www.mediafire.com/'
                    },
                    maxContentLength: 100 * 1024 * 1024, // 100MB limit
                    timeout: 30000
                });
                
                const fileBuffer = Buffer.from(fileResponse.data);
                
                // Set appropriate headers for file download
                res.setHeader('Content-Type', data.mimetype);
                res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
                res.setHeader('Content-Length', fileBuffer.length);
                res.setHeader('Cache-Control', 'no-cache');
                
                return res.send(fileBuffer);
                
            } catch (downloadError) {
                console.error("MediaFire Download Error:", downloadError.message);
                
                return res.reply({
                    success: false,
                    error: "File download failed",
                    message: "Could not download the file from MediaFire",
                    ...(debug && { detail: downloadError.message })
                }, { code: 500 });
            }
        } else {
            return res.reply({
                success: false,
                error: "Invalid type parameter",
                message: "Type must be 'info' or 'download'"
            }, { code: 400 });
        }

    } catch (error) {
        console.error("MediaFire Error:", error.message);
        
        const status = error?.response?.status || 500;
        
        return res.reply({
            success: false,
            error: "MediaFire processing failed",
            message: error.message || "An error occurred while processing MediaFire URL",
            ...(debug && { detail: error.response?.data })
        }, { code: status });
    }
};

handler.alias = 'MediaFire Downloader';
handler.category = 'downloader';
handler.method = 'GET';
handler.params = {
    url: { 
        desc: 'MediaFire file URL', 
        required: true,
        type: 'string',
        example: 'https://www.mediafire.com/file/1fqjqg7e8e2v3ao/example-file.zip/file'
    },
    type: { 
        desc: 'Response type - info (returns file info) or download (returns actual file)', 
        required: false,
        type: 'string',
        options: ['info', 'download', 'json', 'file'],
        example: 'info'
    }
};

module.exports = handler;
