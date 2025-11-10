
const axios = require('axios');

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
  
  async getFileInfo(u) {
    const headers = { ...this.static.headers };
    headers.referer = 'https://v6.www-y2mate.com/';
    headers.range = 'bytes=0-';
    delete headers.origin;
    
    // Get file info without downloading the entire file
    const response = await axios.head(u, {
      headers: headers
    });
    
    const contentLength = response.headers['content-length'];
    const contentType = response.headers['content-type'];
    
    return {
      url: u,
      size: contentLength ? this.formatBytes(parseInt(contentLength)) : 'Unknown',
      sizeBytes: contentLength ? parseInt(contentLength) : null,
      mimeType: contentType || 'application/octet-stream'
    };
  },
  
  formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  async getDownloadInfo(u, f) {
    const { url, filename } = await this.convert(u, f);
    const fileInfo = await this.getFileInfo(url);
    
    return { 
      fileName: this.sanitizeFileName(filename), 
      downloadUrl: url,
      mimeType: f.endsWith('k') ? 'audio/mpeg' : 'video/mp4',
      format: f,
      type: f.endsWith('k') ? 'audio' : 'video',
      size: fileInfo.size,
      sizeBytes: fileInfo.sizeBytes,
      originalUrl: u
    };
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

    yt.log(`Getting download info: ${url} as ${downloadFormat}`);
    
    const result = await yt.getDownloadInfo(url, downloadFormat);
    
    return res.reply({
      success: true,
      provider: 'youtube-downloader',
      data: result,
      message: `YouTube ${result.type} download ready`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("YouTube Download Error:", error.message);
    
    const status = error?.response?.status || 500;
    const detail = error?.response?.data || error.message || String(error);
    
    return res.reply(
      JSON.stringify({
        success: false,
        error: "Download processing failed",
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
