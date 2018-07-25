
const test = require('tape')
const path = require('path')
const fs = require('fs')
const Metalsmith = require('metalsmith')
const postcss = require('./index')

test("Execute example project", assert => {
    new Metalsmith(path.resolve(__dirname, 'test/'))
    .clean(true)
    .source('src')
    .destination('dest')
    
    // call our plugin
    .use(postcss({
        pattern: "index.css",
        config: "postcss.config.js",
    }))
    
    // asserts performed in async
    .build((err, files) => {
        if (err) assert.fail(err);
        
        assert.ok(files['index.css'], 'builds [index.css]')
        
        const actual = files['index.css'].contents.toString();
        const expected = fs.readFileSync('./test/expected.css', 'utf-8');
        
        // verify
        assert.equal(actual, expected, 'output matchs [expected.css]');
        assert.end();
    })
})

// TODO test empty pattern

// TODO test move(), renaming and ignoring files

// TODO test loadConfig(), merging settings

// TODO test loadPlugin()
