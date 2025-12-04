// Lib/Scrape_file/ai/sora.js
const axios = require('axios');
const crypto = require('crypto');

module.exports = async function sora(prompt, ratio = 'portrait') {
  const allowedRatio = ['portrait', 'landscape'];
  const start = Date.now();

  if (!prompt) {
    return {
      success: false,
      status: false,
      message: 'Prompt is required',
      responseTime: `${Date.now() - start}ms`
    };
  }

  if (!allowedRatio.includes(ratio)) {
    return {
      success: false,
      status: false,
      message: `Invalid ratio. Available: ${allowedRatio.join(', ')}`,
      responseTime: `${Date.now() - start}ms`
    };
  }

  try {
    const api = axios.create({
      baseURL: 'https://api.bylo.ai/aimodels/api/v1/ai',
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json; charset=UTF-8',
        origin: 'https://bylo.ai',
        referer: 'https://bylo.ai/features/sora-2',
        'user-agent':
          'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
        'x-requested-with': 'XMLHttpRequest',
        uniqueId: crypto.randomUUID().replace(/-/g, '')
      },
      validateStatus: () => true
    });

    // 1) Buat task
    const createBody = {
      prompt,
      channel: 'SORA2',
      pageId: 536,
      source: 'bylo.ai',
      watermarkFlag: true,
      privateFlag: true,
      isTemp: true,
      vipFlag: true,
      model: 'sora_video2',
      videoType: 'text-to-video',
      aspectRatio: ratio
    };

    const createRes = await api.post('/video/create', createBody);

    if (!createRes.data || createRes.status >= 400) {
      return {
        success: false,
        status: false,
        message: `Create task failed (${createRes.status})`,
        raw: createRes.data || null,
        responseTime: `${Date.now() - start}ms`
      };
    }

    const taskId =
      createRes.data?.data?.id ||
      createRes.data?.data?.taskId ||
      createRes.data?.data?.recordId ||
      createRes.data?.data ||
      null;

    if (!taskId) {
      return {
        success: false,
        status: false,
        message: 'Task ID tidak ditemukan dari server',
        raw: createRes.data || null,
        responseTime: `${Date.now() - start}ms`
      };
    }

    // 2) Polling status
    while (true) {
      const pollRes = await api.get(`/video/${taskId}?channel=SORA2`);

      if (!pollRes.data || pollRes.status >= 400) {
        return {
          success: false,
          status: false,
          message: `Polling gagal (${pollRes.status})`,
          raw: pollRes.data || null,
          responseTime: `${Date.now() - start}ms`
        };
      }

      const d = pollRes.data.data || {};
      const state = d.state;
      const completeData = d.completeData;

      if (state === -1 || state === 'fail' || state === 'failed') {
        return {
          success: false,
          status: false,
          message: 'Generate gagal',
          raw: d,
          responseTime: `${Date.now() - start}ms`
        };
      }

      if (state === 1 || state === 'success' || state === 'done') {
        // coba ambil url video
        let parsed = completeData;
        if (typeof completeData === 'string') {
          try {
            parsed = JSON.parse(completeData);
          } catch {
            // biarin, pake raw string
          }
        }

        const obj = Array.isArray(parsed) ? parsed[0] : parsed || d;
        let videoUrl =
          obj?.videoUrl ||
          obj?.video_url ||
          obj?.url ||
          obj?.downloadUrl ||
          obj?.fileUrl ||
          obj?.video ||
          null;

        return {
          success: true,
          status: !!videoUrl,
          prompt,
          ratio,
          videoUrl,
          raw: parsed,
          responseTime: `${Date.now() - start}ms`
        };
      }

      // masih proses
      await new Promise((res) => setTimeout(res, 1000));
    }
  } catch (e) {
    return {
      success: false,
      status: false,
      message: e.message || String(e),
      responseTime: `${Date.now() - start}ms`
    };
  }
};