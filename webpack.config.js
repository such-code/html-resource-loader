const path = require('path');

const publicPath = '/';

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
                test: /\.html?$/i,
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
                            rules: [
                                {
                                    tag: 'img',
                                    attr: /^src$/i
                                }
                            ]
                        }
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
