const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { consola } = require('consola');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => cb(file.mimetype.startsWith('image/') ? null : new Error('Only images allowed'), file.mimetype.startsWith('image/'))
});

function loadEndpointsFromDirectory(directory, app, baseRoute = '') {
    const endpoints = [];
    const fullPath = path.join(__dirname, '..', directory);
    
    if (!fs.existsSync(fullPath)) {
        consola.warn(`Directory not found: ${fullPath}`);
        return endpoints;
    }
    
    fs.readdirSync(fullPath).forEach(item => {
        const itemPath = path.join(fullPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
            const newRoute = `${baseRoute}/${item.replace(/\[([^\]]+)\]/g, ':$1')}`;
            loadEndpointsFromDirectory(path.join(directory, item), app, newRoute).forEach(cat => {
                const existing = endpoints.find(e => e.name === cat.name);
                existing ? existing.items.push(...cat.items) : endpoints.push(cat);
            });
        } else if (item.endsWith('.js')) {
            try {
                const module = require(itemPath);
                const runFn = typeof module === 'function' ? module : module.run;
                const config = typeof module === 'function' ? module : module;
                
                if (!runFn || typeof runFn !== 'function') return;
                
                const fileName = item.replace('.js', '');
                const endpointPath = baseRoute + '/' + fileName.replace(/\[([^\]]+)\]/g, ':$1');
                const routeParams = [...baseRoute.matchAll(/:([^\/]+)/g), ...fileName.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
                const method = config.method?.toUpperCase() === 'POST' ? 'POST' : 'GET';
                const acceptFiles = config.acceptFiles || false;
                const status = config.status || 'ready';
                const params = config.params || {};
                const routeParamsConfig = config.routeParams || {};
                
                const normalizedRouteParams = {};
                routeParams.forEach(paramName => {
                    const paramValue = routeParamsConfig[paramName];
                    if (paramValue) {
                        if (typeof paramValue === 'string') {
                            normalizedRouteParams[paramName] = {
                                desc: paramValue,
                                required: true,
                                type: 'string'
                            };
                        } else {
                            normalizedRouteParams[paramName] = {
                                desc: paramValue.desc || paramValue,
                                required: true,
                                type: paramValue.type || 'string',
                                example: paramValue.example,
                                options: paramValue.options
                            };
                        }
                    } else {
                        normalizedRouteParams[paramName] = {
                            desc: `Route parameter: ${paramName}`,
                            required: true,
                            type: 'string'
                        };
                    }
                });
                
                const normalizedParams = {};
                Object.entries(params).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        normalizedParams[key] = {
                            desc: value,
                            required: true,
                            type: 'string'
                        };
                    } else {
                        normalizedParams[key] = {
                            desc: value.desc || value,
                            required: value.required !== false,
                            type: value.type || 'string',
                            example: value.example,
                            options: value.options
                        };
                    }
                });
                
                const middlewares = [
                    (req, res, next) => ['error', 'maintenance'].includes(status) ? res.reply(`Endpoint is ${status}.`, { code: 503 }) : next(),
                    ...(acceptFiles ? [upload.single('image')] : []),
                    (req, res, next) => {
                        const data = method === 'POST' ? req.body || {} : req.query || {};
                        
                        if (routeParams.length > 0) {
                            const missingRouteParams = [];
                            
                            routeParams.forEach(paramName => {
                                if (!req.params[paramName] || req.params[paramName] === '') {
                                    missingRouteParams.push(paramName);
                                } else {
                                    const paramConfig = normalizedRouteParams[paramName];
                                    if (paramConfig.options && !paramConfig.options.includes(req.params[paramName])) {
                                        return res.reply({
                                            message: `Invalid value for route parameter '${paramName}'.`,
                                            parameter: paramName,
                                            value: req.params[paramName],
                                            allowed: paramConfig.options
                                        }, { code: 400 });
                                    }
                                    data[paramName] = req.params[paramName];
                                }
                            });
                            
                            if (missingRouteParams.length > 0) {
                                return res.reply({
                                    message: 'Missing required route parameters.',
                                    required: routeParams,
                                    missing: missingRouteParams
                                }, { code: 400 });
                            }
                        }
                        
                        if (acceptFiles && !req.file) return res.reply('File upload required.', { code: 400 });
                        
                        if (Object.keys(normalizedParams).length > 0) {
                            const requiredParams = Object.entries(normalizedParams)
                                .filter(([key, config]) => config.required)
                                .map(([key]) => key);
                            
                            const missingParams = requiredParams.filter(param => 
                                !data[param] || data[param] === ''
                            );
                            
                            if (missingParams.length > 0) {
                                return res.reply({
                                    message: 'Missing required parameters.',
                                    required: requiredParams,
                                    missing: missingParams
                                }, { code: 400 });
                            }
                            
                            for (const [key, paramConfig] of Object.entries(normalizedParams)) {
                                if (paramConfig.options && data[key] && !paramConfig.options.includes(data[key])) {
                                    return res.reply({
                                        message: `Invalid value for parameter '${key}'.`,
                                        parameter: key,
                                        value: data[key],
                                        allowed: paramConfig.options
                                    }, { code: 400 });
                                }
                            }
                        }
                        
                        req.params = data;
                        req.config = { 
                            timeout: config.timeout, 
                            retries: config.retries, 
                            cache: config.cache,
                            rateLimit: config.rateLimit,
                            auth: config.auth,
                            cors: config.cors
                        };
                        next();
                    },
                    (req, res) => runFn(res, req)
                ];
                
                app[method.toLowerCase()](endpointPath, ...middlewares);
                
                const category = config.category || 'Other';
                let categoryObj = endpoints.find(e => e.name === category);
                
                if (!categoryObj) {
                    categoryObj = { name: category, items: [] };
                    endpoints.push(categoryObj);
                }
                
                const endpointInfo = {
                    alias: config.alias || fileName,
                    method: method,
                    path: endpointPath,
                    category: category,
                    status: status
                };
                
                if (routeParams.length > 0) {
                    const routeParamsInfo = [];
                    
                    routeParams.forEach(paramName => {
                        const paramConfig = normalizedRouteParams[paramName];
                        routeParamsInfo.push({
                            name: paramName,
                            description: paramConfig.desc,
                            required: true,
                            type: paramConfig.type,
                            example: paramConfig.example,
                            options: paramConfig.options,
                            location: 'path'
                        });
                    });
                    
                    endpointInfo.routeParameters = routeParamsInfo;
                }
                
                if (acceptFiles) {
                    let formData = { "image": "file (required) - Upload an image file" };
                    Object.entries(normalizedParams).forEach(([key, paramConfig]) => {
                        const requiredText = paramConfig.required ? 'required' : 'optional';
                        let paramDesc = `${paramConfig.type} (${requiredText}) - ${paramConfig.desc}`;
                        if (paramConfig.options) {
                            paramDesc += ` [Options: ${paramConfig.options.join(', ')}]`;
                        }
                        formData[key] = paramDesc;
                    });
                    endpointInfo.formData = formData;
                    endpointInfo.contentType = 'multipart/form-data';
                } else if (method === 'POST' && config.body) {
                    endpointInfo.body = config.body;
                    endpointInfo.contentType = 'application/json';
                } else if (Object.keys(normalizedParams).length > 0) {
                    const required = [];
                    const optional = [];
                    
                    Object.entries(normalizedParams).forEach(([key, paramConfig]) => {
                        const paramInfo = {
                            name: key,
                            description: paramConfig.desc,
                            type: paramConfig.type,
                            example: paramConfig.example,
                            options: paramConfig.options
                        };
                        
                        if (paramConfig.required) {
                            required.push(paramInfo);
                        } else {
                            optional.push(paramInfo);
                        }
                    });
                    
                    endpointInfo.parameters = { required, optional };
                }
                
                categoryObj.items.push(endpointInfo);
            } catch (error) {
                consola.error(`Failed to load ${item}: ${error.message}`);
            }
        }
    });
    
    return endpoints;
}

module.exports = { loadEndpointsFromDirectory };