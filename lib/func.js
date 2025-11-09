const axios = require('axios');
const { fromBuffer } = require('file-type');
const config = require('./config');

const responseWrapper = (req, res, next) => {
    res.reply = (data, options = {}) => {
        const { 
            code = 200
        } = typeof options === 'number' ? { code: options } : options;
        
        const ms = Date.now() - (req.startTime || Date.now());
        const response = code < 300 ? {
            success: true,
            owner: config.owner_name,
            result: data,
            timestamp: new Date().toISOString(),
            responseTime: `${ms}ms`
        } : {
            success: false,
            owner: config.owner_name,
            ...(typeof data === 'object' ? { ...data } : { message: data }),
            timestamp: new Date().toISOString()
        };
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(code).json(response);
    };
    
    res.sendBuffer = (buffer, options = {}) => {
        const { 
            contentType = 'application/octet-stream'
        } = options;
        
        res.setHeader('Content-Type', contentType);
        return res.send(buffer);
    };
    
    res.getBuffer = async (url, options = {}) => {
        const {
            mime = null,
            headers = {}
        } = options;

        try {
            const { data } = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...headers
                }
            });
            
            const buffer = Buffer.from(data);
            const detectedType = await fromBuffer(buffer);
            const actualMimeType = detectedType?.mime || 'unknown';
            
            if (mime) {
                const mimeCategories = {
                    'image': ['image/'],
                    'video': ['video/'],
                    'audio': ['audio/'],
                    'pdf': ['application/pdf'],
                    'text': ['text/'],
                    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument']
                };
                
                const allowedMimes = Array.isArray(mime) ? mime : [mime];
                let isValidMime = false;

                for (const allowedMime of allowedMimes) {
                    if (mimeCategories[allowedMime]) {
                        isValidMime = mimeCategories[allowedMime].some(category => actualMimeType.startsWith(category));
                    } else {
                        isValidMime = actualMimeType === allowedMime || actualMimeType.startsWith(allowedMime);
                    }
                    
                    if (isValidMime) break;
                }

                if (!isValidMime) {
                    const expectedTypes = Array.isArray(mime) ? mime.join(', ') : mime;
                    throw new Error(`Invalid file type. Expected one of: ${expectedTypes}, but detected: ${actualMimeType}.`);
                }
            }
            
            return buffer;
        } catch (error) {
            if (error.code === 'ECONNABORTED') throw new Error(`Request timeout after ${timeout}ms.`);
            if (error.response?.status) throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}.`);
            throw new Error(`Failed to fetch buffer from URL: ${error.message}.`);
        }
    };
    
    next();
};

module.exports = responseWrapper;