
const src = require('../../lib/scrape_file/ai/glm');

let handler = async (res, req) => {
  try {
    console.log('GLM AI endpoint called');
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);

    let prompt, options = {};

    if (req.method === 'GET') {
      // GET request with query parameters
      prompt = req.query?.prompt || req.query?.message || req.query?.query;
      options = {
        model: req.query?.model || req.query?.m || 'glm-4.6',
        search: req.query?.search === 'true' || req.query?.s === 'true' || false,
        reasoning: req.query?.reasoning === 'true' || req.query?.r === 'true' || false,
        userName: req.query?.userName || req.query?.name || `Guest-${Date.now()}`,
        chatId: req.query?.chatId || req.query?.id
      };
    } else if (req.method === 'POST') {
      // POST request with JSON body
      const body = req.body || {};
      prompt = body.prompt || body.message || body.query || body.content;
      
      // Check for array of messages (chat history)
      if (body.messages && Array.isArray(body.messages)) {
        prompt = body.messages;
      }
      
      options = {
        model: body.model || body.m || 'glm-4.6',
        search: body.search || body.s || false,
        reasoning: body.reasoning || body.r || false,
        userName: body.userName || body.name || `Guest-${Date.now()}`,
        chatId: body.chatId || body.id
      };
    }

    console.log('Extracted prompt:', typeof prompt === 'string' ? prompt.substring(0, 100) + '...' : prompt);
    console.log('Extracted options:', options);

    // Check if prompt is provided
    if (!prompt || (typeof prompt === 'string' && prompt.trim() === '')) {
      return res.reply(
        {
          success: false,
          message: 'Prompt/message is required.',
          help: 'For GET: /ai/glm?prompt=YOUR_QUESTION&model=glm-4.6 OR For POST: {"prompt": "YOUR_QUESTION", "model": "glm-4.6"}',
          availableModels: ['glm-4.6', 'glm-4.6v', 'glm-4.5', 'glm-4.5-air', 'glm-4.5v', 'glm-4.1v-9b-thinking', 'z1-rumination', 'z1-32b', 'chatglm', '0808-360b-dr', 'glm-4-32b']
        },
        { code: 400 }
      );
    }

    // Validate model if provided
    const availableModels = ['glm-4.6', 'glm-4.6v', 'glm-4.5', 'glm-4.5-air', 'glm-4.5v', 'glm-4.1v-9b-thinking', 'z1-rumination', 'z1-32b', 'chatglm', '0808-360b-dr', 'glm-4-32b'];
    if (options.model && !availableModels.includes(options.model.toLowerCase())) {
      return res.reply(
        {
          success: false,
          message: 'Invalid model specified.',
          received: options.model,
          availableModels: availableModels,
          default: 'glm-4.6'
        },
        { code: 400 }
      );
    }

    console.log('Calling GLM scraper...');
    const data = await src(prompt, options);
    console.log('GLM scraper returned:', { 
      success: data.success,
      contentLength: data.content?.length,
      hasReasoning: !!data.reasoning,
      hasSearch: !!data.search?.length 
    });

    // Return response
    return res.reply(data, { code: data.success ? 200 : 500 });
  } catch (e) {
    console.error('GLM handler error:', e);
    return res.reply(
      {
        success: false,
        message: e?.message || String(e),
        error: process.env.NODE_ENV === 'development' ? e.stack : undefined
      },
      { code: 500 }
    );
  }
};

handler.alias = 'GLM AI Chat (Z.ai)';
handler.category = 'AI';
handler.method = 'GET'; // Support both GET and POST
handler.params = {
  prompt: {
    desc: 'Your question or message to the AI',
    example: 'Explain quantum computing in simple terms',
    required: true,
    type: 'string'
  },
  model: {
    desc: 'AI model to use. Available: glm-4.6, glm-4.6v, glm-4.5, glm-4.5-air, glm-4.5v, glm-4.1v-9b-thinking, z1-rumination, z1-32b, chatglm, 0808-360b-dr, glm-4-32b',
    example: 'glm-4.6',
    required: false,
    type: 'string',
    options: ['glm-4.6', 'glm-4.6v', 'glm-4.5', 'glm-4.5-air', 'glm-4.5v', 'glm-4.1v-9b-thinking', 'z1-rumination', 'z1-32b', 'chatglm', '0808-360b-dr', 'glm-4-32b']
  },
  search: {
    desc: 'Enable web search (true/false)',
    example: 'false',
    required: false,
    type: 'boolean'
  },
  reasoning: {
    desc: 'Show AI reasoning process (true/false)',
    example: 'false',
    required: false,
    type: 'boolean'
  }
};

// Also support POST requests with chat history
handler.body = {
  prompt: {
    desc: 'Your question or message (alternative to messages array)',
    example: 'Explain quantum computing in simple terms',
    required: false,
    type: 'string'
  },
  messages: {
    desc: 'Array of chat messages for conversation history',
    example: '[{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there!"}]',
    required: false,
    type: 'array'
  },
  model: {
    desc: 'AI model to use',
    example: 'glm-4.6',
    required: false,
    type: 'string'
  },
  search: {
    desc: 'Enable web search',
    example: false,
    required: false,
    type: 'boolean'
  },
  reasoning: {
    desc: 'Show AI reasoning process',
    example: false,
    required: false,
    type: 'boolean'
  }
};

module.exports = handler;
