const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const yt = {
  static: Object.freeze({
    baseUrl: 'https://cnv.cx',
    headers: {
      'accept-encoding': 'gzip, deflate, br, zstd',
      'origin': 'https://frame.y2meta-uk.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
    }
  }),
  
  log(m) { console.log(`[yt-downloader] ${m}`) },
  
  resolveConverterPayload(link, f = '128k') {
    const audioFormats = ['128k', '320k'];
    const videoFormats = ['144p', '240p', '360p', '720p', '1080p'];
    const allFormats = [...audioFormats, ...videoFormats];
    
    if (!allFormats.includes(f)) {
      throw Error(`Invalid format. Available: ${allFormats.join(', ')}`);
    }
    
    const type = f.endsWith('k') ? 'mp3' : 'mp4';
    const audioBitrate = type === 'mp3' ? parseInt(f) + '' : '128';
    const videoQuality = type === 'mp4' ? parseInt(f) + '' : '720';
    
    return { 
      link, 
      format: type, 
      audioBitrate: audioBitrate, 
      videoQuality: videoQuality, 
      filenameStyle: 'pretty', 
      vCodec: 'h264' 
    };
  },
  
  sanitizeFileName(n) {
    const extMatch = n.match(/\.[^.]+$/);
    if (!extMatch) return n.replace(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
    
    const ext = extMatch[0];
    const name = n.replace(new RegExp(`\\${ext}$`), '')
                 .replace(/[^A-Za-z0-9]/g, '_')
                 .replace(/_+/g, '_')
                 .toLowerCase();
    return name + ext;
  },
  
  async getBuffer(u) {
    const headers = { ...this.static.headers };
    headers.referer = 'https://v6.www-y2mate.com/';
    headers.range = 'bytes=0-';
    delete headers.origin;
    
    const response = await axios.get(u, {
      headers: headers,
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  },
  
  async getKey() {
    const response = await axios.get(this.static.baseUrl + '/v2/sanity/key', {
      headers: this.static.headers
    });
    return response.data;
  },
  
  async convert(u, f) {
    const { key } = await this.getKey();
    const payload = this.resolveConverterPayload(u, f);
    const headers = { key, ...this.static.headers };
    
    const response = await axios.post(this.static.baseUrl + '/v2/converter', 
      new URLSearchParams(payload).toString(),
      { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    return response.data;
  },
  
  async download(u, f) {
    const { url, filename } = await this.convert(u, f);
    const buffer = await this.getBuffer(url);
    return { 
      fileName: this.sanitizeFileName(filename), 
      buffer,
      mimeType: f.endsWith('k') ? 'audio/mpeg' : 'video/mp4'
    };
  }
}

async function convertToFast(buffer) {
  const tempDir = './temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  const tempIn = path.join(tempDir, `temp_in_${Date.now()}.mp4`);
  const tempOut = path.join(tempDir, `temp_out_${Date.now()}.mp4`);
  
  try {
    fs.writeFileSync(tempIn, buffer);
    
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-i', tempIn, 
        '-c', 'copy', 
        '-movflags', 'faststart', 
        tempOut
      ]);
      
      ff.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });
      
      ff.on('error', reject);
    });
    
    const newBuffer = fs.readFileSync(tempOut);
    return newBuffer;
  } finally {
    // Clean up temp files
    try { if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn); } catch (e) {}
    try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch (e) {}
  }
}

let handler = async (res, req) => {
  try {
    const { url, format = '720p', type = 'video' } = req.params;
    const debug = String(req?.query?.debug || '').trim() === '1';
    
    if (!url) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: "URL parameter is required",
          message: "Please provide a YouTube URL"
        }),
        { code: 400 }
      );
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9\-\_]{11})/;
    if (!youtubeRegex.test(url)) {
      return res.reply(
        JSON.stringify({
          success: false,
          error: "Invalid YouTube URL",
          message: "Please provide a valid YouTube URL"
        }),
        { code: 400 }
      );
    }

    // Determine format based on type
    let downloadFormat = format;
    if (type === 'audio') {
      if (!['128k', '320k'].includes(format)) {
        downloadFormat = '128k'; // Default audio format
      }
    } else {
      if (!['144p', '240p', '360p', '720p', '1080p'].includes(format)) {
        downloadFormat = '720p'; // Default video format
      }
    }

    yt.log(`Downloading: ${url} as ${downloadFormat}`);
    
    const result = await yt.download(url, downloadFormat);
    
    // Convert video to faststart for better streaming
    if (result.mimeType === 'video/mp4') {
      try {
        result.buffer = await convertToFast(result.buffer);
      } catch (convertError) {
        yt.log(`FFmpeg conversion failed, using original: ${convertError.message}`);
        // Continue with original buffer if conversion fails
      }
    }

    // Return as downloadable file
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    return res.send(result.buffer);

  } catch (error) {
    console.error("YouTube Download Error:", error.message);
    
    const status = error?.response?.status || 500;
    const detail = error?.response?.data || error.message || String(error);
    
    return res.reply(
      JSON.stringify({
        success: false,
        error: "Download failed",
        message: error.message || "An error occurred while processing the video",
        ...(debug ? { detail } : {})
      }),
      { code: status }
    );
  }
};

handler.alias = 'YouTube Downloader';
handler.category = 'downloader';
handler.method = 'GET';
handler.params = {
  url: { 
    desc: 'YouTube video URL', 
    required: true,
    type: 'string',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  format: { 
    desc: 'Download format - Audio: 128k, 320k | Video: 144p, 240p, 360p, 720p, 1080p', 
    required: false,
    type: 'string',
    options: ['128k', '320k', '144p', '240p', '360p', '720p', '1080p'],
    example: '720p'
  },
  type: {
    desc: 'Download type (audio/video) - auto-detected from format if not specified',
    required: false,
    type: 'string',
    options: ['audio', 'video'],
    example: 'video'
  }
};

module.exports = handler;
