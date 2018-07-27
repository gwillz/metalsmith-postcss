# Metalsmith PostCSS

PostCSS integration for Metalsmith.

## Key features

- loading `postcss.config.js` files
- target rewriting (`.sss -> .css`)
- unit tests

## Usage

```js
const postcss = require('metalsmith-postcss')

new Metalsmith(__dirname)
.use(postcss({
    pattern: '**/*.{sss,css}',
    config: './postcss.config.js',
    // 'config' AND/OR inline (these will override config file settings)
    plugins: {
        'postcss-preset-env': {stage: 1},
        ...
    },
    map: {inline: true},
}))
.build(err => {
    if (err) throw err;
})
```

## Notes

I wrote this plugin because I wasn't getting what I wanted from existing
solutions. In a mindless coding rage I ended up with this.

Perhaps later when I'm feeling more bold, a pull-request into
[metalsmith-postcss](//github.com/axa-ch/metalsmith-postcss/)
would be more appropriate.
