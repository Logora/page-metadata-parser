const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: ['./parser.js'],
  externals: {
    url: 'window',
  },
  output: {
    path: path.resolve(__dirname, 'client'),
    filename: 'page-metadata-parser.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(?:js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: "defaults" }]
            ]
          }
        }
      }
    ]
  }
};

