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

module.exports = [{
  stats: 'errors-only', // Suppress output
  mode: 'production', // Optimize stuff
  entry: {
    vida: path.resolve(__dirname, './src/js/vida.js')
  },
  resolve: {
    extensions: ['.js', '.scss']
  },
  output: {
    path: path.resolve(__dirname, './build/'),
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
          /(node_modules)/
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
      }, {
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
}];
