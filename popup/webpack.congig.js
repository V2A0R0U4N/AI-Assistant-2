// const path = require('path');

// module.exports = {
//   entry: './content/chat-loader.js',
//   output: {
//     filename: 'chat-bundle.js',
//     path: path.resolve(__dirname, 'dist'),
//   },
//   module: {
//     rules: [
//       {
//         test: /\.(js|jsx)$/,
//         exclude: /node_modules/,
//         use: {
//           loader: 'babel-loader',
//           options: {
//             presets: ['@babel/preset-react']
//           }
//         }
//       }
//     ]
//   },
//   resolve: {
//     extensions: ['.js', '.jsx']
//   }
// };