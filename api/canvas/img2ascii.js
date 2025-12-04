
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

async function img2ascii(buffer, { width = '100' } = {}) {
    try {
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Image buffer is required');
        const { mime } = await fromBuffer(buffer);
        if (!/image/.test(mime)) throw new Error('Buffer must be an image');
        
        const form = new FormData();
        form.append('art_type', 'mono');
        form.append('userfile', buffer, `${Date.now()}_rynn.jpg`);
        form.append('width', width.toString());
        
        const { data: rynn } = await axios.post('https://www.ascii-art-generator.org/', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });
        
        const resultPath = rynn.match(/\/FW\/result\.php\?name=[a-f0-9]{32}/g);
        if (!resultPath || resultPath.length === 0) {
            throw new Error('Failed to generate ASCII art');
        }
        
        const { data } = await axios.get('https://www.ascii-art-generator.org' + resultPath[0], {
            timeout: 30000
        });
        const $ = cheerio.load(data);
        
        const asciiArt = $('#result-preview-wrap').text().trim();
        if (!asciiArt) {
            throw new Error('Failed to extract ASCII art');
        }
        
        return asciiArt;
    } catch (error) {
        throw new Error(`ASCII conversion failed: ${error.message}`);
    }
}

// Main handler function
const run = async (res, req) => {
    try {
        let width, url;
        
        // Handle both GET and POST methods
        if (req.method === 'POST') {
            // For POST: check file upload first, then body, then query
            if (req.file) {
                width = req.body?.width || req.query?.width || '100';
            } else if (req.body && typeof req.body === 'object') {
                width = req.body.width || req.query?.width || '100';
                url = req.body.url;
            } else {
                width = req.query?.width || '100';
                url = req.query?.url;
            }
        } else {
            // For GET: only use query parameters
            width = req.query?.width || '100';
            url = req.query?.url;
        }

        // Check if file is uploaded or URL is provided
        if (!req.file && !url) {
            return res.reply({
                message: "Image file or URL is required",
                usage: {
                    post_file_upload: "POST /canvas/img2ascii with 'image' file in form-data",
                    post_json: "POST /canvas/img2ascii with JSON: {\"url\": \"https://...\", \"width\": 100}",
                    get_url: "GET /canvas/img2ascii?url=https://example.com/image.jpg&width=80"
                },
                parameters: {
                    width: "ASCII art width (50-200, default: 100)",
                    url: "Image URL to convert"
                }
            }, { code: 400 });
        }

        let imageBuffer;

        if (req.file) {
            // Use uploaded file
            imageBuffer = req.file.buffer;
        } else if (url) {
            // Download image from URL
            try {
                imageBuffer = await res.getBuffer(url, { 
                    mime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
            } catch (error) {
                return res.reply({
                    message: "Failed to download image from URL",
                    error: error.message,
                    url: url
                }, { code: 400 });
            }
        }

        // Validate width parameter
        const widthNum = parseInt(width);
        if (isNaN(widthNum) || widthNum < 50 || widthNum > 200) {
            return res.reply({
                message: "Width must be a number between 50 and 200",
                provided: width,
                allowed_range: "50-200"
            }, { code: 400 });
        }

        // Convert image to ASCII
        const asciiArt = await img2ascii(imageBuffer, { width: widthNum.toString() });

        // Return the result
        res.reply({
            success: true,
            result: asciiArt,
            metadata: {
                width: widthNum,
                source: req.file ? 'file_upload' : 'url',
                lines: asciiArt.split('\n').length,
                characters: asciiArt.length,
                method: req.method
            },
            preview: asciiArt.length > 500 ? 
                `First 500 characters (full result has ${asciiArt.length} chars):\n\`\`\`\n${asciiArt.slice(0, 500)}...\n\`\`\`` : 
                `Full result (${asciiArt.length} characters):\n\`\`\`\n${asciiArt}\n\`\`\``
        });
        
    } catch (error) {
        console.error('Image to ASCII Error:', error);
        res.reply({
            message: "Failed to convert image to ASCII art",
            error: error.message,
            suggestion: [
                "Ensure the image is valid and accessible",
                "Try a different width value (50-200)",
                "Check if the image format is supported"
            ]
        }, { code: 500 });
    }
};

// API Configuration
const config = {
    alias: 'Image to ASCII Art',
    category: 'Canvas',
    status: 'ready',
    method: 'POST', // Primary method for loader registration
    acceptFiles: true,
    params: {
        width: {
            desc: 'Width of ASCII art (50-200)',
            required: false,
            type: 'number',
            example: 100,
            default: 100
        },
        url: {
            desc: 'Image URL (alternative to file upload)',
            required: false,
            type: 'string',
            example: 'https://example.com/image.jpg'
        }
    }
};

// Export both run function and config
module.exports = {
    run,
    ...config
};
