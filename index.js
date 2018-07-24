
const path = require('path')
const match = require('multimatch')
const realpostcss = require('postcss')

module.exports = function main(options) {
    options = Object.assign({
        pattern: '**/*.css',    // Only process these files
        config: null,           // load a PostCSS config from elsewhere
        plugins: {},            // plugin map {module-name -> {options}}
        map: null,              // sourcemaps
        parser: null,           // parser module
        synctax: null,          // syntax module
    }, options)
    
    // plugin export
    return async function postcss(files, metalsmith, done) {
        try {
            // filter for processing files
            const validFiles = match(Object.keys(files), options.pattern);
            
            if (validFiles.length === 0) {
                throw new Error(`Pattern '${options.pattern}' did not match any files.`);
            }
            
            // settings for postcss
            const {plugins, settings} = await loadConfig(options, metalsmith._directory);
            
            const engine = realpostcss(plugins);
            
            // do the thing, concurrently
            await Promise.all(validFiles.map(file => (
                render(engine, files[file], {
                    ...settings,
                    from: path.resolve(metalsmith._source, file),
                    to: path.resolve(metalsmith._destination, file),
                })
            )))
            
            // rename files (abc.* => abc.css)
            for (let filename of validFiles) {
                move(files, filename);
            }
            done();
        }
        catch (err) {
            done(err);
        }
    }
}

/**
 * Perform PostCSS processing.
 */
function render(engine, file, settings) {
    return engine.process(file.contents.toString(), settings)
    .then(result => {
      file.contents = new Buffer(result.css);
    })
}

/**
 * Rename a file, abc.* -> abc.css
 */
function move(files, filename) {
    const {dir, name, ext} = path.parse(filename);
    const newname = path.join(dir, name + '.css');
    
    // don't rename if it's indentical or not applicable
    if (newname !== filename && ext !== '.css') {
        files[newname] = files[filename];
        delete files[filename];
    }
}

/**
 * Attempt to load the config file if specified. Loaded settings will
 * override those specified in the 'options'.
 */
function loadConfig(options, dirname) {
    return new Promise(resolve => {
        let {pattern, config, plugins, ...settings} = options;
        
        // load a config if present, prefer settings from options
        if (config) {
            const target = require.resolve(config, module.parent);
            const loaded = require(target);
            plugins = {...plugins, ...loaded.plugins},
            settings = {
                ...loaded,
                ...settings,
            }
        }
        // replace plugin map with list of plugin modules
        resolve({
            plugins: loadPlugins(plugins),
            settings,
        });
    })
}

/**
 * Load plugin map (name -> args) and return a list of plugin modules.
 */
function loadPlugins(plugins) {
    return Object.entries(plugins).map(([name, args]) => {
        // this ensures we get the path relative to the calling script
        const target = require.resolve(name, module.parent);
        return require(target)(args);
    })
}
