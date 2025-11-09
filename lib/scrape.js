const path = require('node:path');
const fs = require('node:fs');
const { consola } = require('consola');

let scrapers = {};
let loaded = false;

const scrape = (name) => {
    if (!loaded) {
        const loadScrapersFromDirectory = (directory, prefix = '') => {
            try {
                const items = fs.readdirSync(directory, { withFileTypes: true });
                
                for (let item of items) {
                    const itemPath = path.join(directory, item.name);
                    
                    if (item.isDirectory()) {
                        const subfolderPrefix = prefix ? `${prefix}/${item.name}` : item.name;
                        loadScrapersFromDirectory(itemPath, subfolderPrefix);
                    } else if (item.isFile() && item.name.endsWith('.js')) {
                        const scraperName = item.name.replace('.js', '');
                        const fullScraperName = prefix ? `${prefix}/${scraperName}` : scraperName;
                        
                        try {
                            scrapers[fullScraperName] = require(path.resolve(itemPath));
                        } catch (e) {
                            consola.error(`Failed to load ${fullScraperName} Scrape : ${e}`);
                        }
                    }
                }
            } catch (e) {
                consola.error(`Failed to load scrapers from directory ${directory}:`, e);
            }
        };
        
        loadScrapersFromDirectory('./lib/scrape_file');
        loaded = true;
    }
    
    if (!scrapers[name]) throw new Error(`Scrape '${name}' not found`);
    return scrapers[name];
};

module.exports = scrape;