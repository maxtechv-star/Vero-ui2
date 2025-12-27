const crypto = require('crypto');
const fetch = require('node-fetch');

class Youtubers {
  constructor() {
    this.hex = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  }

  async uint8(hex) {
    const pecahan = hex.match(/[\dA-F]{2}/gi);
    if (!pecahan) throw new Error("Format tidak valid");
    return new Uint8Array(pecahan.map(h => parseInt(h, 16)));
  }

  b64Byte(b64) {
    const bersih = b64.replace(/\s/g, "");
    const biner = Buffer.from(bersih, 'base64');
    const hasil = new Uint8Array(biner.length);
    for (let i = 0; i < biner.length; i++) hasil[i] = biner[i];
    return hasil;
  }

  async key() {
    const raw = await this.uint8(this.hex);
    return await crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, false, ["decrypt"]);
  }

  async Data(base64Terenkripsi) {
    const byteData = this.b64Byte(base64Terenkripsi);
    if (byteData.length < 16) throw new Error("Data terlalu pendek");

    const iv = byteData.slice(0, 16);
    const data = byteData.slice(16);

    const kunci = await this.key();
    const hasil = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      kunci,
      data
    );

    const teks = new TextDecoder().decode(new Uint8Array(hasil));
    return JSON.parse(teks);
  }

  async getCDN() {
    const res = await fetch("https://media.savetube.me/api/random-cdn");
    const data = await res.json();
    return data.cdn;
  }

  async infoVideo(linkYoutube) {
    const cdn = await this.getCDN();
    const res = await fetch(`https://${cdn}/v2/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: linkYoutube }),
    });

    const hasil = await res.json();
    if (!hasil.status) throw new Error(hasil.message || "Gagal ambil data video");

    const isi = await this.Data(hasil.data);
    return {
      judul: isi.title,
      durasi: isi.durationLabel,
      thumbnail: isi.thumbnail,
      kode: isi.key,
      kualitas: isi.video_formats.map(f => ({
        label: f.label,
        kualitas: f.height,
        default: f.default_selected
      })),
      infoLengkap: isi
    };
  }

  async getDownloadLink(kodeVideo, kualitas, type) {
    const cdn = await this.getCDN();
    const res = await fetch(`https://${cdn}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        downloadType: kualitas === "128" ? "audio" : type,
        quality: kualitas,
        key: kodeVideo,
      }),
    });

    const json = await res.json();
    if (!json.status) throw new Error(json.message);
    return json.data.downloadUrl;
  }

  async downloadyt(linkYoutube, kualitas, type) {
    try {
      const data = await this.infoVideo(linkYoutube);
      const linkUnduh = await this.getDownloadLink(data.kode, kualitas, type);
      return {
        status: true,
        judul: data.judul,
        kualitasTersedia: data.kualitas,
        thumbnail: data.thumbnail,
        durasi: data.durasi,
        url: linkUnduh,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

// Main function
async function YeteeDeel(youtubeUrl, quality, type = 'video') {
  try {
    const yt = new Youtubers();
    
    // Map quality string to actual quality parameter
    let qualityParam = quality;
    if (type === 'audio') {
      qualityParam = '128'; // MP3 audio quality
    } else {
      // Map common quality strings to numeric values
      const qualityMap = {
        '144p': '144',
        '240p': '240',
        '360p': '360',
        '480p': '480',
        '720p': '720',
        '1080p': '1080',
        'mp3': '128',
        'mp4': '720'
      };
      
      if (quality && qualityMap[quality.toLowerCase()]) {
        qualityParam = qualityMap[quality.toLowerCase()];
      } else {
        qualityParam = quality || '720'; // default to 720p
      }
    }
    
    // Get download info
    const result = await yt.downloadyt(youtubeUrl, qualityParam, type);
    
    // Format response
    const videoId = extractVideoId(youtubeUrl);
    const response = {
      success: true,
      title: result.judul,
      thumbnail: result.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      duration: result.durasi,
      downloadUrl: result.url,
      quality: qualityParam,
      type: qualityParam === '128' ? 'audio' : 'video',
      availableQualities: result.kualitasTersedia || []
    };
    
    return response;
    
  } catch (error) {
    console.error("YouTube Downloader Error:", error.message);
    throw error;
  }
}

// Extract video ID from URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Helper function to validate YouTube URLs
function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /^(https?:\/\/)?(www\.)?(youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^(https?:\/\/)?(www\.)?(youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^(https?:\/\/)?(www\.)?(youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

module.exports = YeteeDeel;
