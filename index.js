
const path = require('path')
const match = require('multimatch')
// load as a peerDependency
const realpostcss = (function() {
    const target = require.resolve('postcss', module.parent);
    return require(target);
})()

module.exports = function main(options) {
    options = Object.assign({
        pattern: '**/*.css',    // Only process these files
        config: null,           // load a PostCSS config from elsewhere
        plugins: {},            // plugin map {module-name -> {options}}
        // any valid postcss options
    }, options)
    
    // plugin export
    return async function postcss(files, metalsmith, done) {
        try {
            const {pattern, config, ...other} = options;
            
            // filter for processing files
            const validFiles = match(Object.keys(files), pattern);
            
            if (validFiles.length === 0) {
                throw new Error(`Pattern '${pattern}' did not match any files.`);
            }
            
            // settings for postcss
            const {plugins, settings} =
                loadConfig(path.resolve(metalsmith._directory, config), other);
            
            const engine = realpostcss(plugins);
            
            // do the thing, concurrently
            await Promise.all(validFiles.map(file => (
                render(engine, files[file], {
                    ...settings,
                    from: path.resolve(metalsmith._directory, metalsmith._source, file),
                    to: path.resolve(metalsmith._directory, metalsmith._destination, file),
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
 * Attempt to load the config file if specified. Local (options) settings will
 * override those loaded from the config file.
 */
function loadConfig(config, options) {
    let {plugins, ...settings} = options;
    // load a config if present, prefer settings from options
    if (config) {
        const target = require.resolve(config, module.parent);
        const loaded = require(target);
        plugins = {...plugins, ...loaded.plugins}
        settings = {...loaded, ...settings}
    }
    // replace plugin map with list of plugin modules
    return {settings, plugins: loadPlugins(settings.plugins)}
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
