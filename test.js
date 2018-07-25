
const test = require('tape')
const path = require('path')
const fs = require('fs')
const Metalsmith = require('metalsmith')
const postcss = require('./index')

test("Execute example project", assert => {
    create()
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

test("Empty pattern", assert => {
    create()
    .use(postcss({
        pattern: "foo.bar"
    }))
    .build((err, files) => {
        assert.ok(!!err, "error for bad pattern");
        assert.end();
    })
})

test("move()", assert => {
    const files = {
        'foo.css': '1234',
        'bar.sss': '5678',
    }
    
    for (let file in files) {
        postcss.move(files, file);
    }
    
    assert.equal(files['foo.css'], '1234', "[foo.css] is unchanged");
    assert.equal(files['bar.css'], '5678', "[bar.css] now exists");
    assert.notOk(files['bar.sss'], "[bar.sss] should not exist");
    
    assert.end();
})

test("loadConfig()", assert => {
    const actual = postcss.loadConfig('./test/postcss.config.js', {
        map: true,
        another: 123,
    })
    const expected = {
        map: true,
        another: 123,
        plugins: {
            'postcss-import': {},
            'postcss-preset-env': {stage: 1},
        },
    }
    
    assert.deepEqual(actual, expected);
    assert.end();
})

test("loadPlugins()", assert => {
    const actual = postcss.loadPlugins({
        'postcss-import': {},
        'postcss-preset-env': {stage: 1},
    })
    
    assert.equal(typeof actual[0], 'function', "loaded plugin[0] is a function");
    assert.equal(typeof actual[1], 'function', "loaded plugin[1] is a function");
    assert.ok(actual[0].postcssVersion, "function is a postcss plugin");
    assert.equal(
        actual[0].postcssVersion,
        actual[1].postcssVersion,
        "[postcssVersion] matches"
    );
    assert.end();
})


// shorthand
function create() {
    return new Metalsmith(path.resolve(__dirname, 'test/'))
    .clean(true)
    .source('src')
    .destination('dest')
}
