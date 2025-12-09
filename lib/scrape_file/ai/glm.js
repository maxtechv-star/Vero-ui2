
/**
 * Creator: @Paxsenix0 (Alex)
 * Base: https://chat.z.ai
 * That's it, i guess?
 * Ohh Also... DO NOT REUPLOAD OR REPOST THIS SCRAPE WITHOUT ANY CREDIT/SOURCE TO ORIGINAL POST.
 **/

const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

class GLM {
  static url = "https://chat.z.ai";
  static apiEndpoint = "https://chat.z.ai/api/v2/chat/completions";
  static working = false;
  static activeByDefault = true;
  static defaultModel = "GLM-4.6";
  
  static apiKey = null;
  static authUserId = null;
  static models = [
    'glm-4.6',
    'glm-4.6v',
    'glm-4.5',
    'glm-4.5-air',
    'glm-4.5v',
    'glm-4.1v-9b-thinking',
    'z1-rumination',
    'z1-32b',
    'chatglm',
    '0808-360b-dr',
    'glm-4-32b'
  ];
  static modelAliases = {
    'glm-4.6': 'GLM-4-6-API-V1',
    'glm-4.6v': 'glm-4.6v',
    'glm-4.5': '0727-360B-API',
    'glm-4.5-air': '0727-106B-API',
    'glm-4.5v': 'glm-4.5v',
    'glm-4.1v-9b-thinking': 'GLM-4.1V-Thinking-FlashX',
    'z1-rumination': 'deep-research',
    'z1-32b': 'zero',
    'chatglm': 'glm-4-flash',
    '0808-360b-dr': '0808-360B-DR',
    'glm-4-32b': 'glm-4-air-250414'
  };

  static createSignatureWithTimestamp(e, t) {
    const currentTime = Date.now();
    const currentTimeString = String(currentTime);
    const dataString = `${e}|${Buffer.from(t).toString('base64')}|${currentTimeString}`;
    const timeWindow = Math.floor(currentTime / (5 * 60 * 1000));

    const baseSignature = crypto.createHmac('sha256', 'key-@@@@)))()((9))-xxxx&&&%%%%%').update(String(timeWindow)).digest('hex');

    const signature = crypto.createHmac('sha256', baseSignature).update(dataString).digest('hex');

    return {
      signature,
      timestamp: currentTime
    };
  }

  static prepareAuthParams(token, userId) {
    const currentTime = String(Date.now());
    const requestId = crypto.randomUUID();

    const basicParams = {
      timestamp: currentTime,
      requestId: requestId,
      user_id: userId,
    };

    const timezoneOffset = -new Date().getTimezoneOffset();
    const now = new Date();
    
    const additionalParams = {
      version: "0.0.1",
      platform: "web",
      token: token,
      user_agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      language: "en-US",
      languages: "en-US",
      timezone: "Asia/Makassar",
      cookie_enabled: "true",
      screen_width: "360",
      screen_height: "806",
      screen_resolution: "360x806",
      viewport_height: "714",
      viewport_width: "360",
      viewport_size: "360x714",
      color_depth: "24",
      pixel_ratio: "2",
      current_url: "https://chat.z.ai/c/25455c46-9de3-4689-9e0a-0f9f70c5b67e",
      pathname: "/c/25455c46-9de3-4689-9e0a-0f9f70c5b67e",
      search: "",
      hash: "",
      host: "chat.z.ai",
      hostname: "chat.z.ai",
      protocol: "https:",
      referrer: "",
      title: "Z.ai Chat - Free AI powered by GLM-4.6 & GLM-4.5",
      timezone_offset: String(timezoneOffset),
      local_time: now.toISOString(),
      utc_time: now.toUTCString(),
      is_mobile: "true",
      is_touch: "true",
      max_touch_points: "2",
      browser_name: "Chrome",
      os_name: "Android",
    };

    const allParams = { ...basicParams, ...additionalParams };
    const urlParamsString = new URLSearchParams(allParams).toString();

    const sortedPayload = Object.keys(basicParams).sort().map(k => `${k},${basicParams[k]}`).join(',');

    return {
      sortedPayload,
      urlParams: urlParamsString
    };
  }

  static getEndpointSignature(token, userId, userPrompt) {
    const authParams = this.prepareAuthParams(token, userId);
    const { sortedPayload, urlParams } = authParams;
    
    const lastUserPrompt = userPrompt.trim();
    const signatureData = this.createSignatureWithTimestamp(sortedPayload, lastUserPrompt);
    const { signature, timestamp } = signatureData;

    const endpoint = `${this.apiEndpoint}?${urlParams}&signature_timestamp=${timestamp}`;

    return { endpoint, signature, timestamp };
  }

  static getCacheFilePath() {
    return path.join(process.cwd(), '.glm_auth_cache.json');
  }

  static async getAuthFromCache() {
    const cacheFilePath = this.getCacheFilePath();
    
    try {
      const stats = await fs.stat(cacheFilePath);
      const currentTime = Date.now();
      const timeDiff = (currentTime - stats.mtimeMs) / 1000;
      
      if (timeDiff < 5 * 60) {
        const data = await fs.readFile(cacheFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      return null;
    }
    
    return null;
  }

  static async saveAuthToCache(data) {
    const cacheFilePath = this.getCacheFilePath();
    await fs.writeFile(cacheFilePath, JSON.stringify(data, null, 2));
  }

  static async getModels() {
    let authResponse = await this.getAuthFromCache();
    if (!authResponse) {
      const response = await axios.get(`${this.url}/api/v1/auths/`);
      authResponse = response.data;
      await this.saveAuthToCache(authResponse);
    }
    this.apiKey = authResponse.token;
    this.authUserId = authResponse.id;
      
    if (!this.models) {
      const modelsResponse = await axios.get(`${this.url}/api/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      
      const data = modelsResponse.data.data || [];
      this.modelAliases = {};
      
      data.forEach(item => {
        const name = (item.name || '').replace('任务专用', 'ChatGLM').toLowerCase();
        this.modelAliases[name] = item.id;
      });
      
      this.models = Object.keys(this.modelAliases);
    }
    
    return this.models;
  }

  static getModel(modelName) {
    const name = modelName.toLowerCase();
    if (this.modelAliases[name]) {
      return this.modelAliases[name];
    }
    throw new Error(`Model '${modelName}' not found. Available models: ${Object.keys(this.modelAliases).join(', ')}`);
  }

  static getLastUserMessageContent(messages) {
    if (typeof messages === 'string') {
      return messages;
    }
    
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          return messages[i].content;
        }
      }
    }
    
    return messages || '';
  }

  static getCurrentDateTimeFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = days[now.getDay()];
    
    return {
      datetime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}:${seconds}`,
      weekday: weekday
    };
  }

  static async *createAsyncGenerator(prompt, options = {}) {
    const messages = typeof prompt === 'string' ? [{ role: 'user', content: prompt }] : prompt;
    await this.getModels();
   
    const modelId = this.getModel(options.model || "glm-4.6");

    if (!this.apiKey) {
      throw new Error("Failed to obtain API key from authentication endpoint");
    }

    const userPrompt = this.getLastUserMessageContent(messages);
    const { endpoint, signature } = this.getEndpointSignature(this.apiKey, this.authUserId, userPrompt);

    const dateTime = this.getCurrentDateTimeFormatted();
    const userName = options.userName || `Guest-${Date.now()}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar';

    const data = {
      stream: true,
      model: modelId,
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
      signature_prompt: userPrompt,
      params: {},
      features: {
        image_generation: false,
        web_search: options.search || false,
        auto_web_search: options.search || false,
        preview_mode: true,
        flags: [],
        enable_thinking: options.reasoning || false
      },
      variables: {
        "{{USER_NAME}}": userName,
        "{{USER_LOCATION}}": "Unknown",
        "{{CURRENT_DATETIME}}": dateTime.datetime,
        "{{CURRENT_DATE}}": dateTime.date,
        "{{CURRENT_TIME}}": dateTime.time,
        "{{CURRENT_WEEKDAY}}": dateTime.weekday,
        "{{CURRENT_TIMEZONE}}": timezone,
        "{{USER_LANGUAGE}}": "en-US"
      },
      chat_id: options.chatId || crypto.randomUUID(),
      id: crypto.randomUUID(),
      current_user_message_id: crypto.randomUUID(),
      current_user_message_parent_id: null,
      background_tasks: {
        title_generation: true,
        tags_generation: true
      }
    };

    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-FE-Version': 'prod-fe-1.0.150',
        'X-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
        'Origin': 'https://chat.z.ai',
        'Referer': 'https://chat.z.ai/'
      },
      responseType: 'stream'
    };

    if (options.proxy) {
      config.proxy = options.proxy;
    }

    const response = await axios.post(endpoint, data, config);
  
    let usage = null;
    let lineBuffer = '';
  
    let mainBuffer = [];
    let lastYieldedAnswerLength = 0;
    let answerStartIndex = -1;
    let inAnswerPhase = false;

    for await (const chunk of response.data) {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
      
        try {
          const jsonData = JSON.parse(line.slice(6));
          if (jsonData.type !== 'chat:completion') continue;
        
          const eventData = jsonData.data;
          if (!eventData) continue;

          const phase = eventData.phase;
  
          if (eventData.usage && !usage) {
            usage = eventData.usage;
            yield { type: 'usage', ...usage };
          }

          if (typeof eventData.edit_index === 'number') {
            const index = eventData.edit_index;
            const contentChunk = (eventData.edit_content || '').split('');
            mainBuffer.splice(index, contentChunk.length, ...contentChunk);
  
            if (inAnswerPhase && answerStartIndex >= 0 && index >= answerStartIndex) {
              const currentAnswer = mainBuffer.slice(answerStartIndex).join('');
              if (currentAnswer.length > lastYieldedAnswerLength) {
                const newContent = currentAnswer.slice(lastYieldedAnswerLength);
                yield { type: 'content', content: newContent };
                lastYieldedAnswerLength = currentAnswer.length;
              }
            }
          } else if (eventData.delta_content) {
            const contentChunk = eventData.delta_content.split('');
            mainBuffer.splice(mainBuffer.length, 0, ...contentChunk);
          
            if (phase === 'thinking') {
              let cleaned = eventData.delta_content.replace(/<details[^>]*>/g, '').replace(/<\/details>/g, '').replace(/<summary>.*?<\/summary>/gs, '').replace(/^>\s?/gm, '');
            
              if (cleaned.trim()) {
                yield { type: 'reasoning', content: cleaned };
              }
            } else if (phase === 'answer') {
              if (!inAnswerPhase) {
                inAnswerPhase = true;
                const fullText = mainBuffer.join('');
                const detailsEnd = fullText.lastIndexOf('</details>');
                answerStartIndex = detailsEnd >= 0 ? detailsEnd + '</details>'.length : mainBuffer.length - contentChunk.length;
              }
            
              yield { type: 'content', content: eventData.delta_content };
              lastYieldedAnswerLength += eventData.delta_content.length;
            }
          }
        
          if (phase === 'done' && eventData.done) {
            const fullOutput = mainBuffer.join('');
            const toolCallMatch = fullOutput.match(/<glm_block[^>]*>([\s\S]*?)<\/glm_block>/);
            if (toolCallMatch) {
              try {
                const dt = JSON.parse(toolCallMatch[1]);
                const searchResults = dt?.data?.browser?.search_result;
                if (searchResults && searchResults.length > 0) {
                  yield { type: 'search', results: searchResults };
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }

  static async createCompletion(messages, options = {}) {
    let fullContent = '';
    let reasoning = '';
    let usage = null;
    let search = [];

    for await (const chunk of this.createAsyncGenerator(messages, options)) {
      if (chunk.type === 'content') {
        fullContent += chunk.content;
      } else if (chunk.type === 'reasoning') {
        reasoning += chunk.content;
      } else if (chunk.type === 'usage') {
        usage = chunk;
      } else if (chunk.type === 'search') {
        search = chunk.results;
      }
    }

    return {
      success: true,
      content: fullContent.trim(),
      reasoning: reasoning.trim(),
      search: search,
      usage: usage,
      model: options.model || 'glm-4.6'
    };
  }
}

// Export for use with scrape system
module.exports = async (prompt, options = {}) => {
  try {
    console.log('GLM scraper called with:', { prompt: prompt?.substring(0, 50) + '...', options });
    
    // Handle different input formats
    let messages;
    let opts = {};
    
    if (typeof prompt === 'string') {
      messages = prompt;
      opts = options;
    } else if (typeof prompt === 'object') {
      // If first param is object, assume it contains both prompt and options
      messages = prompt.prompt || prompt.message || prompt.query;
      opts = { ...prompt, ...options };
    }
    
    if (!messages) {
      throw new Error('Prompt/message is required');
    }
    
    // Clean options
    const cleanOptions = {
      model: opts.model || opts.m || 'glm-4.6',
      search: opts.search || opts.s || false,
      reasoning: opts.reasoning || opts.r || false,
      userName: opts.userName || opts.name || `Guest-${Date.now()}`,
      chatId: opts.chatId || opts.id || undefined
    };
    
    const result = await GLM.createCompletion(messages, cleanOptions);
    return result;
  } catch (error) {
    console.error('GLM scraper error:', error.message);
    return {
      success: false,
      message: error.message || 'Unknown error occurred',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

// Also export the class for advanced usage
module.exports.GLM = GLM;
