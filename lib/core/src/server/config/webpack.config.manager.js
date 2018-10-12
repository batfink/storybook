import path from 'path';
import webpack from 'webpack';
import { getEnvironment } from 'universal-dotenv';
import Dotenv from 'dotenv-webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlWebpackHarddiskPlugin from '@ndelangen/html-webpack-harddisk-plugin';

import { version } from '../../../package.json';
import { includePaths, excludePaths, loadEnv, nodePaths, getBabelRuntimePath } from './utils';
import { getPreviewHeadHtml, getManagerHeadHtml, getPreviewBodyHtml } from '../utils';

export default ({ configDir, babelOptions, entries, configType }) => {
  const entriesMeta = {
    iframe: {
      headHtmlSnippet: getPreviewHeadHtml(configDir, process.env),
      bodyHtmlSnippet: getPreviewBodyHtml(),
    },
    manager: {
      headHtmlSnippet: getManagerHeadHtml(configDir, process.env),
    },
  };

  return {
    name: 'manager',
    mode: 'production',
    bail: true,
    devtool: 'none',
    entry: { manager: entries.manager },
    output:
      configType === 'DEVELOPMENT'
        ? {
            path: path.join(__dirname, '..', 'public'),
            filename: '[name].[chunkhash].bundle.js',
            // Here we set the publicPath to ''.
            // This allows us to deploy storybook into subpaths like GitHub pages.
            // This works with css and image loaders too.
            // This is working for storybook since, we don't use pushState urls and
            // relative URLs works always.
            publicPath: '',
          }
        : {
            filename: 'static/[name].[chunkhash].bundle.js',
            publicPath: '',
          },
    plugins: [
      new HtmlWebpackPlugin({
        filename: `index.html`,
        chunksSortMode: 'none',
        alwaysWriteToDisk: true,
        inject: false,
        templateParameters: (compilation, files, options) => ({
          compilation,
          files,
          options,
          version,
          ...entriesMeta.manager,
        }),
        template: require.resolve(`../templates/index.ejs`),
      }),
      new HtmlWebpackHarddiskPlugin(),
      new webpack.DefinePlugin(loadEnv({ production: true })),
      new webpack.DefinePlugin(getEnvironment().webpack),
      new Dotenv({ silent: true }),
    ],
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: babelOptions,
            },
          ],
          include: includePaths,
          exclude: excludePaths,
        },
        {
          test: /\.md$/,
          use: [
            {
              loader: require.resolve('raw-loader'),
            },
          ],
        },
      ],
    },
    resolve: {
      // Since we ship with json-loader always, it's better to move extensions to here
      // from the default config.
      extensions: ['.js', '.jsx', '.json'],
      // Add support to NODE_PATH. With this we could avoid relative path imports.
      // Based on this CRA feature: https://github.com/facebookincubator/create-react-app/issues/253
      modules: ['node_modules'].concat(nodePaths),
      alias: {
        '@babel/runtime': getBabelRuntimePath(),
      },
    },
    optimization: {
      // Automatically split vendor and commons for preview bundle
      // https://twitter.com/wSokra/status/969633336732905474
      // splitChunks: {
      //   chunks: chunk => chunk.name !== 'manager',
      // },
      // Keep the runtime chunk seperated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: true,
    },
  };
};