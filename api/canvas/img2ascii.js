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

const handler = async (res, req) => {
    try {
        const { width = '100', url } = req.method === 'POST' ? (req.body || {}) : req.query;
        
        // Check if file is uploaded or URL is provided
        if (!req.file && !url) {
            return res.reply({
                message: "Image file or URL is required",
                usage: {
                    post_file_upload: "POST /canvas/img2ascii with multipart/form-data containing 'image' file",
                    post_json: "POST /canvas/img2ascii with JSON body: { \"url\": \"https://...\", \"width\": 100 }",
                    get_url: "GET /canvas/img2ascii?url=https://example.com/image.jpg&width=80"
                },
                parameters: {
                    width: "ASCII art width (default: 100, range: 50-200)",
                    url: "Image URL to convert"
                },
                examples: {
                    curl_file: "curl -X POST -F 'image=@image.jpg' -F 'width=100' http://your-api/canvas/img2ascii",
                    curl_url_post: "curl -X POST -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com/image.jpg\",\"width\":80}' http://your-api/canvas/img2ascii",
                    curl_url_get: "curl -X GET 'http://your-api/canvas/img2ascii?url=https://example.com/image.jpg&width=80'"
                }
            }, { code: 400 });
        }

        let imageBuffer;

        if (req.file) {
            // Use uploaded file from POST multipart/form-data
            imageBuffer = req.file.buffer;
        } else if (url) {
            // Download image from URL (works for both GET and POST)
            try {
                imageBuffer = await res.getBuffer(url, { 
                    mime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
            } catch (error) {
                return res.reply({
                    message: "Failed to download image from URL",
                    error: error.message,
                    url: url,
                    suggestion: "Check if the URL is accessible and points to a valid image file"
                }, { code: 400 });
            }
        }

        // Validate width parameter
        const widthNum = parseInt(width);
        if (isNaN(widthNum) || widthNum < 50 || widthNum > 200) {
            return res.reply({
                message: "Width must be a number between 50 and 200",
                provided: width,
                allowed_range: "50-200",
                default: 100
            }, { code: 400 });
        }

        // Convert image to ASCII
        const asciiArt = await img2ascii(imageBuffer, { width: widthNum.toString() });

        // Return the result
        const response = {
            success: true,
            result: asciiArt,
            metadata: {
                width: widthNum,
                source: req.file ? 'file_upload' : 'url',
                lines: asciiArt.split('\n').length,
                characters: asciiArt.length,
                method: req.method,
                input: req.file ? `file: ${req.file.originalname}` : `url: ${url}`
            },
            preview: asciiArt.length > 500 ? 
                `First 500 characters:\n\`\`\`\n${asciiArt.slice(0, 500)}...\n\`\`\`` : 
                `Full result:\n\`\`\`\n${asciiArt}\n\`\`\``
        };

        res.reply(response);
        
    } catch (error) {
        console.error('Image to ASCII Error:', error);
        res.reply({
            message: "Failed to convert image to ASCII art",
            error: error.message,
            method: req.method,
            input_type: req.file ? 'file_upload' : 'url',
            suggestion: [
                "Ensure the image is valid and accessible",
                "Try a different width value between 50-200",
                "Check if the image format is supported (JPEG, PNG, GIF, WebP, BMP)",
                "For large images, try a smaller width value"
            ]
        }, { code: 500 });
    }
};

// API Configuration for both GET and POST
const apiConfig = {
    alias: 'Image to ASCII Art Converter',
    category: 'canvas',
    status: 'ready',
    method: ['GET', 'POST'], // Support both methods
    acceptFiles: true, // Enable file uploads for POST
    params: {
        width: {
            desc: 'Width of the ASCII art (50-200 characters)',
            required: false,
            type: 'number',
            example: 100,
            default: 100,
            min: 50,
            max: 200
        },
        url: {
            desc: 'Image URL to convert (alternative to file upload)',
            required: false,
            type: 'string',
            example: 'https://example.com/image.jpg',
            formats: ['JPEG', 'PNG', 'GIF', 'WebP', 'BMP']
        }
    },
    body: {
        desc: 'JSON body for POST requests (alternative to file upload)',
        example: {
            url: "https://example.com/image.jpg",
            width: 80
        }
    },
    formData: {
        desc: 'Multipart form data for POST requests',
        fields: {
            image: "file (required) - Image file to convert",
            width: "number (optional) - Width of ASCII art (50-200)"
        }
    }
};

// Apply configuration to handler
Object.assign(handler, apiConfig);

module.exports = handler;
