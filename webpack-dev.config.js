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

// Build for testing in example directory
module.exports = [{
  devServer: {
    contentBase: path.resolve(__dirname, 'build/')
  },
  mode: 'development',
  entry: {
    'example': path.resolve(__dirname, './build/example-es6.js')
  },
  output: {
    path: path.resolve(__dirname, 'build/'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          "style-loader", // creates style nodes from JS strings
          "css-loader", // translates CSS into CommonJS
          "sass-loader", // compiles Sass to CSS, using Node Sass by default
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: [
                require('autoprefixer')({browsers: browserSupport})
              ]
            }
          }
        ]
      }
    ]
  }

// Separate WebWorker compilation for VerovioWorker file
}, {
  mode: 'development',
  target: 'webworker',
  entry: {
    'VerovioWorker': path.resolve(__dirname, './src/js/VerovioWorker.js')
  },
  output: {
    path: path.resolve(__dirname, './build/'),
    filename: '[name].js'
  }
}];
