const { getFastFluxImageBuffer } = scrape('ai/fastflux');

let handler = async (res, req) => {
  try {
    const { text } = req.query;

    if (!text) {
      return res.reply(
        { success: false, error: 'Parameter text wajib diisi.' },
        { code: 400 }
      );
    }

    const { buffer, mime } = await getFastFluxImageBuffer(text);

    // kirim sebagai file image langsung
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);

  } catch (error) {
    console.error('FastFlux Buffer Error:', error);

    const msg =
      typeof error === 'string'
        ? error
        : error?.message || JSON.stringify(error);

    // fallback error JSON
    res.reply({ success: false, error: msg }, { code: 500 });
  }
};

handler.alias = 'FastFlux Buffer Image';
handler.category = 'AI';
handler.params = {
  text: {
    desc: 'Text prompt untuk generate image',
    example: 'kucing lucu pakai hoodie'
  }
};

module.exports = handler;