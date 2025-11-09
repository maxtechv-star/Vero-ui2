(async () => {
    const express = require('express');
    const path = require('path');
    const chalk = require('chalk');
    const { consola } = require('consola');
    const loader = require('./lib/loader');
    const scraper = require('./lib/scrape');
    const minim = require('./lib/func');
    const axios = require('axios');
    const config = require('./lib/config');
    const PORT = process.env.PORT || 7860;
    
    const app = express();
    app.set('json spaces', 2);
    
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, './views'));
    app.use(express.static(path.join(__dirname, './public')));
    app.use(express.json({ limit: '1gb' }));
    app.use(express.urlencoded({ limit: '1gb', extended: true }));
    app.use(minim);
    
    consola.start('Starting server initialization...');
    
    app.use((req, res, next) => {
        req.startTime = Date.now();
        
        res.on('finish', () => {
            const statusColor = res.statusCode >= 400 ? 'red' : res.statusCode >= 300 ? 'yellow' : 'green';
            const methodColor = req.method === 'POST' ? 'blue' : req.method === 'GET' ? 'green' : 'cyan';
            consola.info(`${chalk[methodColor](req.method)} ${req.path} [${chalk[statusColor](res.statusCode)}]`);
        });
        
        next();
    });
    
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
    
    String.prototype.toBoolean = function () {
        return this.toLowerCase() === 'true' || false;
    };
    
    Array.prototype.randomize = function () {
        return this[Math.floor(Math.random() * this.length)];
    };
    
    consola.start('Loading scraper module...');
    global.scrape = (name) => scraper(name);
    
    consola.start('Loading API endpoints...');
    global.allEndpoints = loader.loadEndpointsFromDirectory('api', app);
    
    console.log('');
    consola.ready(`Loaded ${allEndpoints.reduce((total, category) => total + category.items.length, 0)} endpoints`);
    
    const methodCounts = {};
    const totalEndpoints = allEndpoints.reduce((total, category) => {
        category.items.forEach(item => {
            methodCounts[item.method] = (methodCounts[item.method] || 0) + 1;
        });
        return total + category.items.length;
    }, 0);
    
    app.get('/', async (req, res) => {
        const { type } = req.query;
        
        if (type === 'json') {
            res.reply({
                meta: config.meta,
                baseURL: `${req.protocol}://${req.get('host')}`,
                endpoints: allEndpoints
            });
        } else {
            res.render('index', {
                name: config.meta.name,
                version: config.meta.version,
                description: config.meta.description,
                current_status: config.current_status,
                icon: config.meta.icon,
                endpoints: allEndpoints,
                categories: config.categories,
                links: config.links
            });
        }
    });
    
    app.get('/category/:categoryName', async (req, res) => {
        const { type } = req.query;
        const { categoryName } = req.params;
        
        const normalizedInput = categoryName.toLowerCase().replace(/-/g, ' ');
        
        const category = allEndpoints.find(cat => {
            const normalizedCatName = cat.name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            return normalizedCatName === normalizedInput;
        });
        
        if (!category) return res.reply('Category not found.', { code: 404 });
        
        if (type === 'json') {
            res.reply({
                meta: config.meta,
                baseURL: `${req.protocol}://${req.get('host')}`,
                category: category
            });
        } else {
            res.render('category', {
                name: config.meta.name,
                description: config.meta.description,
                icon: config.meta.icon,
                categoryName: category.name,
                categoryDesc: config.categories[categoryName.toLowerCase()]?.description || `${category.items.length} endpoints available.`,
                category: category
            });
        }
    });
    
    app.use((req, res, next) => {
        consola.info(`404: ${chalk.red(req.method)} ${req.path}`);
        res.reply('Not Found.', { code: 404 });
    });
    
    app.use((err, req, res, next) => {
        if (err.code === 'LIMIT_FILE_SIZE') return res.reply('File size exceeds 10MB limit.', { code: 413 });
        if (err.code === 'LIMIT_FILE_COUNT') return res.reply('Maximum 1 file allowed.', { code: 413 });
        if (err.message === 'Only image files are allowed') return res.reply('Only image files are allowed.', { code: 400 });
        
        consola.error(`500: ${chalk.red(err.message)}`);
        res.reply(err.message, { code: 500 });
    });
    
    app.listen(PORT, () => {
        console.log('');
        consola.success(`Server started successfully`);
        consola.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);
        
        console.log('');
        consola.info(`${chalk.bold('Endpoint Summary:')}`);
        consola.info(`Total Endpoints: ${chalk.green(totalEndpoints)}`);
        consola.info(`Categories: ${chalk.blue(allEndpoints.length)}`);
        
        try {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            const results = {};
            
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        if (!results[name]) {
                            results[name] = [];
                        }
                        results[name].push(net.address);
                    }
                }
            }
            
            console.log('');
            for (const [, addresses] of Object.entries(results)) {
                for (const addr of addresses) {
                    consola.info(`Network: ${chalk.cyan(`http://${addr}:${PORT}`)}`);
                }
            }
        } catch (error) {
            consola.warn(`Cannot detect network interfaces: ${error.message}`);
        }
        
        consola.info(`${chalk.dim('Ready for connections')}`);
        console.log('');
    });
    
    module.exports = app;
})();