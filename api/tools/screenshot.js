const axios = require('axios');

const ssweb = {
    _static: Object.freeze({
        baseUrl: 'https://www.screenshotmachine.com',
        baseHeaders: { 
            'content-encoding': 'zstd',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxOutputLength: 200
    }),
    
    pretyError(string) {
        if (!string) return '(empty message)'
        let message = ''
        try { 
            message = JSON.stringify(string, null, 2) 
        } catch { 
            message = string 
        }
        return message.length >= this._static.maxOutputLength ? 
            message.substring(0, this._static.maxOutputLength) + ' [trimmed]' : message
    },
    
    async getCookie() {
        try {
            const response = await axios.get(this._static.baseUrl, { 
                headers: this._static.baseHeaders,
                responseType: 'text'
            });
            
            const cookie = response.headers['set-cookie']?.
                map(v => v.split(';')[0])
                .join('; ') || '';
                
            if (!cookie) throw new Error('Failed to get cookie');
            return { cookie };
        } catch (error) {
            throw new Error(`${error.response?.status || 'Unknown'} ${error.response?.statusText || ''} ${this.pretyError(error.response?.data)}`);
        }
    },
    
    async getBuffer(reqObj, cookie) {
        if (reqObj.status !== "success") throw new Error("Status not successful");
        
        const { link } = reqObj;
        try {
            const response = await axios.get(this._static.baseUrl + '/' + link, { 
                headers: { 
                    cookie,
                    ...this._static.baseHeaders 
                },
                responseType: 'arraybuffer'
            });
            
            return { buffer: Buffer.from(response.data) };
        } catch (error) {
            throw new Error(`${error.response?.status || 'Unknown'} ${error.response?.statusText || ''} ${this.pretyError(error.response?.data)}`);
        }
    },
    
    async req(url, cookie) {
        const headers = {
            cookie,
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            ...this._static.baseHeaders
        };
        
        const data = "url=" + encodeURIComponent(url) + "&device=desktop&cacheLimit=0";
        
        try {
            const response = await axios.post(this._static.baseUrl + '/capture.php', data, {
                headers: headers
            });
            
            return { reqObj: response.data };
        } catch (error) {
            throw new Error(`${error.response?.status || 'Unknown'} ${error.response?.statusText || ''} ${this.pretyError(error.response?.data)}`);
        }
    },
    
    async capture(url) {
        if (!url) throw new Error('URL parameter cannot be empty');
        
        // Validate URL format
        try {
            new URL(url);
        } catch {
            throw new Error('Invalid URL format');
        }
        
        const { cookie } = await this.getCookie();
        const { reqObj } = await this.req(url, cookie);
        const { buffer } = await this.getBuffer(reqObj, cookie);
        return buffer;
    }
}

let handler = async (res, req) => {
    try {
        const { url, type = 'image' } = req.params;
        const debug = String(req?.query?.debug || '').trim() === '1';
        
        if (!url) {
            return res.reply(
                JSON.stringify({
                    success: false,
                    error: "URL parameter is required",
                    message: "Please provide a website URL"
                }),
                { code: 400 }
            );
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return res.reply(
                JSON.stringify({
                    success: false,
                    error: "Invalid URL format",
                    message: "Please provide a valid URL including http:// or https://"
                }),
                { code: 400 }
            );
        }

        console.log(`[Screenshot] Capturing: ${url}`);
        
        const buffer = await ssweb.capture(url);
        
        if (type === 'json' || type === 'base64') {
            // Return as base64 encoded string
            const base64String = buffer.toString('base64');
            return res.reply({
                success: true,
                provider: 'screenshotmachine.com',
                url: url,
                image: `data:image/png;base64,${base64String}`,
                message: "Screenshot captured successfully"
            });
        } else {
            // Return as image file
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `attachment; filename="screenshot-${Date.now()}.png"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            
            return res.send(buffer);
        }

    } catch (error) {
        console.error("Screenshot Error:", error.message);
        
        const status = error?.response?.status || 500;
        const detail = error.message || String(error);
        
        return res.reply(
            JSON.stringify({
                success: false,
                error: "Screenshot capture failed",
                message: error.message || "An error occurred while capturing screenshot",
                ...(debug ? { detail } : {})
            }),
            { code: status }
        );
    }
};

handler.alias = 'Website Screenshot';
handler.category = 'tools';
handler.method = 'GET';
handler.params = {
    url: { 
        desc: 'Website URL to capture', 
        required: true,
        type: 'string',
        example: 'https://google.com'
    },
    type: { 
        desc: 'Response type - image (returns image file) or base64 (returns base64 string)', 
        required: false,
        type: 'string',
        options: ['image', 'base64', 'json'],
        example: 'image'
    }
};

module.exports = handler;
