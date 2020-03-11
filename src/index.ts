
import path from 'path';
import match from 'multimatch';
import type { Processor, ProcessOptions, AcceptedPlugin } from 'postcss';
import type { Plugin, Files } from 'metalsmith';

type postcss = (plugins?: AcceptedPlugin[]) => Processor;

// load as a peerDependency
const realpostcss = (function() {
    const target = require.resolve('postcss', module.parent!);
    return require(target);
})() as postcss;

// plugin map {module-name -> {options}}
interface PostPlugins extends Record<string, any> {}

interface Config extends ProcessOptions {
    plugins: PostPlugins;
}

interface Options extends Config {
    pattern: string;  // Only process these files
    config?: string;  // load a PostCSS config from elsewhere
}

export = main;

function main(opts: Partial<Options>): Plugin {
    const options: Options = {
        pattern: '**/*.css',
        plugins: {},
        // any valid postcss options
        ...opts,
    };
    
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
            let {plugins, ...settings} = !!config
                ? loadConfig(path.resolve(metalsmith.directory(), config), other)
                : other;
            
            const engine = realpostcss(loadPlugins(plugins));
            
            // do the thing, concurrently
            await Promise.all(validFiles.map(file => (
                render(engine, files[file], {
                    ...settings,
                    from: path.resolve(metalsmith.source(), file),
                    to: path.resolve(metalsmith.destination(), file),
                })
            )))
            
            // rename files (abc.* => abc.css)
            for (let filename of validFiles) {
                move(files, filename);
            }
            done(null, files, metalsmith);
        }
        catch (err) {
            done(err, files, metalsmith);
        }
    }
}

/**
 * Perform PostCSS processing.
 */
function render(engine: Processor, file: any, settings: ProcessOptions) {
    return engine.process(file.contents.toString(), settings)
    .then(result => {
      file.contents = Buffer.from(result.css);
    })
}

/**
 * Rename a file, abc.* -> abc.css
 */
function move(files: Files, filename: string) {
    const {dir, name} = path.parse(filename);
    const newname = path.join(dir, name + '.css');
    
    // don't rename if it's not applicable
    if (newname !== filename) {
        files[newname] = files[filename];
        delete files[filename];
    }
}

/**
 * Load a config file. Local (options) settings will
 * override those loaded from the config file.
 * This does a lookup that respects peerDependencies.
 */
function loadConfig(config: string, settings: Config): Config {
    const target = require.resolve(config, module.parent!);
    const loaded = require(target);
    
    return {
        ...loaded,
        ...settings,
        plugins: loaded.plugins || settings.plugins,
    };
}

/**
 * Load plugin map (name -> args) and return a list of plugin modules.
 */
function loadPlugins(plugins: PostPlugins): AcceptedPlugin[] {
    return Object.entries(plugins).map(([name, args]) => {
        // this ensures we get the path relative to the calling script
        const target = require.resolve(name, module.parent!);
        return require(target)(args);
    })
}

// export utility functions for testing
main.move = move;
main.loadConfig = loadConfig;
main.loadPlugins = loadPlugins;
