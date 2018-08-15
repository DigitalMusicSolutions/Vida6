const path = require('path');

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
          "sass-loader" // compiles Sass to CSS, using Node Sass by default
        ]
      }
    ]
  }
}];
