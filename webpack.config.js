const path = require('path');

const browserSupport = [
    'ie >= 11',
    'ie_mob >= 11',
    'ff >= 30',
    'chrome >= 21',
    'safari >= 8',
    'opera >= 23',
    'ios >= 8',
    'android >= 4.4',
    'bb >= 10'
];

// Actual vida.js compilation
module.exports = [{
    mode: 'production',
    entry: {
        vida: './vida.js'
    },
    resolve: {
        extensions: ['.js']
    },
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: '[name].min.js',
        library: 'vida',
        libraryTarget: 'commonjs2'
    },
    node: {
        fs: 'empty'
    },
    module: {
        rules: [
            // Babel transpilation for certain browser targets
            {
                exclude: [
                    /(node_modules)/,
                    /verovio/
                ],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['env', {
                            targets: {
                                browsers: browserSupport
                            },
                            useBuiltIns: true
                        }]]
                    }
                }
            }
            // use worker-loader for VerovioWorker.js
            // {
            //     test: /\.VerovioWorker\.js$/,
            //     use: { loader: 'worker-loader' }
            // }
        ]
    }

// Separate WebWorker compilation
}, {
    mode: 'production',
    target: 'webworker',
    entry: {
        'VerovioWorker': './src/js/VerovioWorker.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: '[name].js'
    }
}, {
    mode: 'production',
    entry: {
        'example': './example/example-es6.js'
    },
    output: {
        path: path.resolve(__dirname, 'example/'),
        filename: '[name].js'
    }
}];
