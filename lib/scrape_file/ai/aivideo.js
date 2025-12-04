// Lib/Scrape_file/ai/veo3.js
const axios = require('axios');
const crypto = require('crypto');

const ALLOWED_MODELS = ['veo-3-fast', 'veo-3'];

module.exports = async function veo3(options = {}) {
  const {
    prompt,
    model = 'veo-3-fast',
    auto_sound = false,
    auto_speech = false,
  } = options;

  // ─── Validasi awal ───────────────────────────────────────
  if (!prompt) {
    return {
      success: false,
      step: 'validate',
      message: 'Prompt is required',
    };
  }

  if (!ALLOWED_MODELS.includes(model)) {
    return {
      success: false,
      step: 'validate',
      message: `Available models: ${ALLOWED_MODELS.join(', ')}`,
    };
  }

  if (typeof auto_sound !== 'boolean' || typeof auto_speech !== 'boolean') {
    return {
      success: false,
      step: 'validate',
      message: 'auto_sound & auto_speech must be boolean',
    };
  }

  try {
    // ─── 1. Ambil token Turnstile dari nekorinn ─────────────
    let cfRes;
    try {
      cfRes = await axios.get('https://api.nekorinn.my.id/tools/rynn-stuff', {
        params: {
          mode: 'turnstile-min',
          siteKey: '0x4AAAAAAAdJZmNxW54o-Gvd',
          url: 'https://lunaai.video/features/v3-fast',
          accessKey:
            '5238b8ad01dd627169d9ac2a6c843613d6225e6d77a6753c75dc5d3f23813653',
        },
        timeout: 15000,
      });
    } catch (err) {
      return formatAxiosError(err, 'turnstile');
    }

    const token = cfRes?.data?.result?.token;
    if (!token) {
      return {
        success: false,
        step: 'turnstile',
        message: 'Failed to get verify token',
        raw: cfRes?.data || null,
      };
    }

    const uid = crypto
      .createHash('md5')
      .update(Date.now().toString())
      .digest('hex');

    // ─── 2. Create task ke aiarticle.erweima ────────────────
    let taskRes;
    try {
      taskRes = await axios.post(
        'https://aiarticle.erweima.ai/api/v1/secondary-page/api/create',
        {
          prompt: prompt,
          imgUrls: [], // versi text-to-video, kalau mau image tinggal isi di sini
          quality: '720p',
          duration: 8,
          autoSoundFlag: auto_sound,
          soundPrompt: '',
          autoSpeechFlag: auto_speech,
          speechPrompt: '',
          speakerId: 'Auto',
          aspectRatio: '16:9',
          secondaryPageId: 1811,
          channel: 'VEO3',
          source: 'lunaai.video',
          type: 'features',
          watermarkFlag: true,
          privateFlag: true,
          isTemp: true,
          vipFlag: true,
          model: model,
        },
        {
          headers: {
            uniqueid: uid,
            verify: token,
          },
          timeout: 20000,
        }
      );
    } catch (err) {
      return formatAxiosError(err, 'create-task');
    }

    const recordId = taskRes?.data?.data?.recordId;
    if (!recordId) {
      return {
        success: false,
        step: 'create-task',
        message: 'recordId not found in response',
        raw: taskRes?.data || null,
      };
    }

    // ─── 3. Polling status task ─────────────────────────────
    const maxPoll = 40; // ± 40 detik (1s tiap poll)
    for (let i = 0; i < maxPoll; i++) {
      let pollRes;
      try {
        pollRes = await axios.get(
          `https://aiarticle.erweima.ai/api/v1/secondary-page/api/${recordId}`,
          {
            headers: {
              uniqueid: uid,
              verify: token,
            },
            timeout: 15000,
          }
        );
      } catch (err) {
        return formatAxiosError(err, 'polling');
      }

      const state = pollRes?.data?.data?.state;
      const completeData = pollRes?.data?.data?.completeData;

      if (state === 'fail') {
        return {
          success: false,
          step: 'polling',
          state,
          result: safeJSON(completeData),
        };
      }

      if (state === 'success') {
        return {
          success: true,
          step: 'done',
          state,
          result: safeJSON(completeData),
        };
      }

      // masih processing → tunggu 1 detik
      await new Promise((r) => setTimeout(r, 1000));
    }

    return {
      success: false,
      step: 'timeout',
      message: 'Polling timeout, video not finished in time',
    };
  } catch (err) {
    return {
      success: false,
      step: 'unknown',
      message: err.message || String(err),
    };
  }
};

function safeJSON(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function formatAxiosError(err, step) {
  if (err.response) {
    return {
      success: false,
      step,
      message: `Upstream error: ${err.response.status} ${err.response.statusText || ''}`.trim(),
      status: err.response.status,
      data: err.response.data || null,
    };
  }
  if (err.request) {
    return {
      success: false,
      step,
      message: 'No response from upstream server',
    };
  }
  return {
    success: false,
    step,
    message: err.message || String(err),
  };
}