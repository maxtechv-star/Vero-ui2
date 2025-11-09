const axios = require('axios');

class CloudflareAI {
    constructor() {
        this.cf = axios.create({
            baseURL: 'https://api.cloudflare.com/client/v4/accounts/c58ae8d6fee186118aa4b0e3e67ed70c',
            headers: {
                authorization: 'Bearer 9clMPIX-3jiKLWPqv2dh0lzNO__63SoYUx2kHrnH'
            }
        });
    }
    
    models = async function (type = 'text-generation') {
        try {
            const { data } = await this.cf.get('/ai/models/search');
            
            const excludedModels = {
                'text-generation': ['@cf/openai/gpt-oss-120b', '@cf/openai/gpt-oss-20b']
            };
            
            const availableTypes = [...new Set(data.result.filter(model => model.task?.name).map(model => model.task.name.toLowerCase().replace(/\s+/g, '-')))];
            const normalizedType = type.toLowerCase().trim();
            if (!availableTypes.includes(normalizedType)) throw new Error(`Invalid type: "${type}". Available types are: ${availableTypes.join(', ')}.`);
            
            return data.result.filter(model => {
                const taskName = model.task?.name?.toLowerCase().replace(/\s+/g, '-');
                
                if (taskName !== normalizedType) return false;
                const excludedList = excludedModels[normalizedType] || [];
                if (excludedList.includes(model.name)) return false;
                
                return true;
            }).map(model => ({
                id: model.id,
                name: model.name,
                description: model.description,
                task: model.task,
                created_at: model.created_at
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    chat = async function (payload, { model = '@hf/thebloke/zephyr-7b-beta-awq' } = {}) {
        try {
            if (typeof payload !== 'object') throw new Error('Payload must be a object.');
            
            const models = await this.models();
            const _model = models.find(m => model === m.name);
            if (_model.task.name !== 'Text Generation' || ['@cf/openai/gpt-oss-120b', '@cf/openai/gpt-oss-20b'].includes(model)) throw new Error('Model not supported.');
            const { data } = await this.cf.post(`/ai/run/${model}`, payload);
            
            return data.result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = new CloudflareAI();