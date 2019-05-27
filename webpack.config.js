const path = require('path');

const publicPath = '/';

const quoteTest = /^(['"])(.+(?!\1).)\1$/;
function stringFilter($) {
    return quoteTest.test($);
}
function resourceDeserializer($) {
    if (/^(['"])(.+(?!\1)).\1$/.test($)) {
        return $.replace(quoteTest, '$2');
    }
}

const resourceLoaderRules = [
    {
        selector: [ { tag: 'img' }, { attr: 'src' } ],
        source: { attr: 'src' },
        target: { attr: 'src' }
    },
    {
        selector: [ { tag: 'ng-include' }, { attr: 'src', filter: stringFilter } ],
        source: { attr: 'src' },
        target: { tag: 'replace' },
    },
    {
        selector: [ { attr: 'ng-include' }, { attr: 'data-append', exclude: true }, { attr: 'data-prepend', exclude: true } ],
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
];

module.exports = {
    entry: './index.html',
    context: path.resolve(__dirname, 'src/test'),
    resolveLoader: {
        alias: {
            'html-resource-loader': require.resolve('./')
        }
    },
    output: {
        path: path.resolve(__dirname, 'dist/test'),
        publicPath: publicPath,
    },
    module: {
        rules: [
            {
                test: /\.htm$/i,
                use: [
                    {
                        loader: 'raw-loader',
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
                test: /\.html$/i,
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
                            rules: resourceLoaderRules                        }
                    }
                ],
            },
            {
                test: /\.(eot|svg|cur)$/i,
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
                test: /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            name: 'images/[path][name].[ext]',
                            limit: 1000
                        }
                    }
                ],
            },
        ]
    },
    plugins: [
        // TODO: Add suppress module plugin to suppress main module.
    ]
};
