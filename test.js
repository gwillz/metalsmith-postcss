
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
    
    .use(postcss({
        pattern: "index.css",
        config: "postcss.config.js",
    }))
    
    .build((err, files) => {
        if (err) assert.fail(err);
        
        assert.ok(files['index.css'])
        
        const actual = files['index.css'].contents.toString();
        const expected = fs.readFileSync('./test/expected.css', 'utf-8');
        
        assert.equal(actual, expected);
    })
    
    assert.end();
})
