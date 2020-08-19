const path = require('path');
const SuppressChunksPlugin = require('suppress-chunks-webpack-plugin').default;

/** @typedef { import(webpack/declarations/WebpackOptions).WebpackOptions } WebpackOptions */
/** @typedef { import(@such-code/content-url-loader).ContentUrlLoaderOptions } ContentUrlLoaderOptions */
/** @typedef { import(./dist/lib/rules-configuration).Rule } ResourceLoaderRule */

const publicPath = '/';

const quoteTest = /^(['"])(.+(?!\1).)\1$/;
function stringFilter($) {
    return quoteTest.test($);
}
function resourceDeserializer($) {
    if (/^(['"])(.+(?!\1)).\1$/.test($)) {
        return $.replace(quoteTest, '$2');
    }
    return $;
}

function resourceSerializer($) {
    return `'${/'/.test($) ? $.replace(/'/g, '\\\'') : $}'`
}

function extractStyleAsObject($style) {
    return $style
        .split(';')
        .filter($ => $.length > 1)
        .reduce(($acc, $expr) => {
            let [style, value] = $expr.split(':', 2);
            return {
                ...$acc,
                [style.trim()]: value.trim(),
            };
        }, {});
}

function renderStyleObject($style) {
    return Object
        .keys($style)
        .map($ => {
            return `${$}:${$style[$]}`;
        })
        .join(';')
}

const URL_REGEX = /^url\(("|'|)((?:.(?!\1\)))*.)\1\)$/;

function extractFromUrl($) {
    if (URL_REGEX.test($)) {
        return $.replace(URL_REGEX, '$2');
    }
    return $;
}

/**
 * @param $styleName string
 * @return ResourceLoaderRule
 */
function buildStyleUrlRule($styleName) {
    return {
        selector: [
            {
                attr: 'style',
                filter: $ => {
                    const style = extractStyleAsObject($);
                    return $styleName in style;
                }
            }
        ],
        source: {
            attr: 'style',
            deserialize: $ => {
                const style = extractStyleAsObject($);
                return extractFromUrl(style[$styleName]);
            }
        },
        target: {
            attr: 'style',
            serialize: ($url, $) => {
                const style = extractStyleAsObject($);
                style[$styleName] = `url(${$url})`;
                return renderStyleObject(style);
            }
        }
    };
}

/**
 * @type ResourceLoaderRule[]
 */
const resourceLoaderRules = [
    // Any <img src="gif|png|jpg"> except for <img src="image.svg">
    {
        selector: [ { tag: 'img' }, { attr: 'src', filter: $ => /\.(?!svg($|\?))/.test($) } ],
        source: { attr: 'src' },
        target: { attr: 'src' }
    },
    // <img src="svg"> by default is replaced by svg content, requires specific loader!
    {
        selector: [ { tag: 'svg' }, { attr: 'data-src' }],
        source: { attr: 'data-src', },
        target: {
            tag: 'replace',
            serialize: ($, $prev) => {
                if (Array.isArray($)) {
                    throw Error('Something went wrong, should be only one node.');
                }
                $.attribs.class = $.attribs.class + ' ' + $prev.attribs.class;
                return $;
            },
        }
    },
    {
        selector: [ { tag: 'ng-include' }, { attr: 'src', filter: stringFilter } ],
        source: { attr: 'src', deserialize: resourceDeserializer },
        target: { tag: 'replace' },
    },
    {
        selector: [ { attr: 'ng-include' }, { attr: 'data-append', exclude: true }, { attr: 'data-prepend', exclude: true }, { attr: 'data-attr', exclude: true }, ],
        source: { attr: 'ng-include', remove: true, deserialize: resourceDeserializer },
        target: { content: 'replace' },
    },
    {
        selector: [ { attr: 'ng-include' }, { attr: 'data-append' } ],
        source: { attr: 'ng-include', remove: true, deserialize: resourceDeserializer },
        target: { content: 'append' },
    },
    {
        selector: [ { attr: 'ng-include' }, { attr: 'data-prepend' } ],
        source: { attr: 'ng-include', remove: true, deserialize: resourceDeserializer },
        target: { content: 'prepend' },
    },
    {
        selector: [ { attr: 'ng-include' }, { attr: 'data-attr' } ],
        source: { attr: 'ng-include', deserialize: resourceDeserializer, remove: true, },
        target: { attr: 'data-attr' },
    },
    buildStyleUrlRule('background-image'),
    buildStyleUrlRule('--md-background-image'),
    {
        selector: [{type: 'script'}, {attr: 'type', filter: $ => $ === 'application/javascript'}, {attr: 'src'} ],
        source: { attr: 'src', remove: true },
        target: { attr: 'data-src' },
    }
];

/**
 * @type WebpackOptions
 */
module.exports = {
    entry: './index.html',
    context: __dirname,
    resolveLoader: {
        alias: {
            'html-resource-loader': require.resolve('../../')
        }
    },
    output: {
        path: path.resolve(__dirname, '../../dist/test'),
        publicPath: publicPath,
    },
    module: {
        rules: [
            {
                test: /\.html?$/i,
                oneOf: [
                    {
                        issuer: {
                            test: /\.html?$/i,
                        },
                        use: [
                            {
                                loader: 'raw-loader',
                                options: { esModule: false, },
                            },
                            {
                                loader: 'html-resource-loader',
                                options: {
                                    rules: resourceLoaderRules
                                }
                            }
                        ],
                    },
                    {
                        use: [
                            {
                                loader: 'file-loader',
                                options: {
                                    name: '[path][name].[ext]',
                                }
                            },
                            {
                                loader: 'html-resource-loader',
                                options: {
                                    rules: resourceLoaderRules
                                }
                            }
                        ],
                    },
                ],
            },
            {
                test: /\.(png|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'images/[path][name].[ext]',
                            limit: 1000
                        }
                    }
                ]
            },
            {
                test: /\.svg$/i,
                oneOf: [
                    {
                        include: [
                            path.resolve(__dirname, './assets/file-code.svg'),
                        ],
                        use: [
                            {
                                loader: 'raw-loader',
                                options: { esModule: false, }
                            }
                        ],
                    },
                    {
                        use: [
                            {
                                loader: 'file-loader',
                                options: {
                                    name: 'images/[path][name].[ext]',
                                    limit: 1000
                                }
                            }
                        ],
                    },
                ],

            }
        ]
    },
    plugins: [
        new SuppressChunksPlugin([ { name: 'main', match: /\.js$/ } ]),
    ]
};
