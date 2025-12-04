const axios = require('axios');
const src = scrape('Photo/Remini');

function sendJson(res, obj, code = 200) {
  try { res.statusCode = code; } catch {}
  try { res.setHeader('Content-Type','application/json'); } catch {}
  res.end(JSON.stringify(obj));
}

async function readBodyAsBuffer(req) {
  return new Promise((resolve,reject)=>{
    const chunks=[]; req.on('data',c=>chunks.push(c));
    req.on('end',()=>resolve(Buffer.concat(chunks)));
    req.on('error',reject);
  });
}

let handler = async (res, req) => {
  const q = req.query || {};
  const model = String(q.model || 'RealESRGAN_x4plus');
  const resolution = Number(q.resolution || 4);
  const face = String(q.face || 'false') === 'true';
  const imgUrl = q.url;

  try {
    // Ambil input gambar
    let inputBuf = null;
    if (imgUrl) {
      const { data } = await axios.get(imgUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      inputBuf = Buffer.from(data);

    } else if (/^image\//i.test(String(req.headers['content-type'] || ''))) {
      inputBuf = await readBodyAsBuffer(req);
    }

    if (!inputBuf) {
      return sendJson(res, {
        success:false,
        error:'Invalid parameters. Kirim ?url=<gambar> atau POST body image/*',
        usage:{
          GET:'/photo/ilaria?model=RealESRGAN_x4plus&resolution=4&url=https://host/image.jpg',
          POST:'curl -X POST -H "Content-Type: image/jpeg" --data-binary @in.jpg https://host/photo/ilaria'
        }
      }, 400);
    }

    // Proses via scraper
    const out = await ilaria(inputBuf, {
      model,
      resolution,
      face
    });

    // Sukses → kirim buffer
    try { res.setHeader('Content-Type', 'image/jpeg'); } catch {}
    try { res.setHeader('Content-Disposition', `inline; filename="ilaria_upscaled.jpg"`); } catch {}

    return res.end(out);

  } catch (e) {
    console.error('ILARIA ERROR:', e);
    return sendJson(res, {
      success:false,
      provider:'ilaria',
      model,
      resolution,
      url: imgUrl || '(body)',
      error: e.message || String(e)
    }, 500);
  }
};

handler.alias = 'Ilaria Upscaler';
handler.category = 'Photo';
handler.params = {
  model:{desc:'Model RealESRGAN', example:'RealESRGAN_x4plus'},
  resolution:{desc:'1-6', example:'4'},
  face:{desc:'Face enhance true/false', example:'true'},
  url:{desc:'URL gambar', example:'https://.../image.jpg'}
};

module.exports = handler;
