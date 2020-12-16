const path = require("path");
const zlib = require("zlib");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCssAssetsWebpackPlugin = require("optimize-css-assets-webpack-plugin");
const TerserWebpacakPlugin = require("terser-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const CompressionPlugin = require("compression-webpack-plugin");
// const FaviconsWebpackPlugin = require("favicons-webpack-plugin");

const isProd = process.env.NODE_ENV === "production"; // Если режим запуска вебпак стоит production = true
const isDev = !isProd;

const PATHS = {
  src: path.join(__dirname, "./src/"),
  public: path.join(__dirname, "./public/"),
  dist: path.join(__dirname, "./dist/"),
  assets: "assets/",
};

const optimization = () => {
  const config = {
    splitChunks: {
      chunks: "all",
    },
  };

  if (isProd) {
    config.minimizer = [
      new OptimizeCssAssetsWebpackPlugin(),
      new TerserWebpacakPlugin(),
      new ImageMinimizerPlugin({
        // Only apply this one to files equal to or over 8192 bytes
        filter: (source) => {
          if (source.byteLength >= 8192) {
            return true;
          }

          return false;
        },
        minimizerOptions: {
          plugins: [["jpegtran", { progressive: true }]],
        },
      }),
      new ImageMinimizerPlugin({
        // Only apply this one to files under 8192
        filter: (source) => {
          if (source.byteLength < 8192) {
            return true;
          }

          return false;
        },
        minimizerOptions: {
          plugins: [["jpegtran", { progressive: false }]],
        },
      }),
    ];
  }

  return config;
};

const filename = (ext, forled) =>
  isDev
    ? `${PATHS.assets}${forled}/[name].${ext}`
    : `${PATHS.assets}${forled}/[name].[contenthash].${ext}`;

const filenameJs = (ext, forled) =>
  isDev ? `${forled}/[name].${ext}` : `${forled}/[name].[contenthash].${ext}`;

const babelOptions = (preset) => {
  const opts = {
    presets: ["@babel/preset-env"],
    plugins: [],
  };

  if (preset) {
    opts.presets.push(preset);
  }

  return opts;
};

const jsLoaders = () => {
  const loaders = [
    {
      loader: "babel-loader",
      options: babelOptions(),
    },
  ];

  if (isDev) {
    loaders.push("eslint-loader");
  }

  return loaders;
};

const plugins = () => {
  const base = [
    new HTMLWebpackPlugin({
      template: "./public/index.html",
      filename: `${PATHS.dist}public/index.html`,
      minify: {
        collapseWhitespace: isProd,
      },
    }),
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: "assets/images/favicon",
          to: "../dist/assets/images/favicon",
        },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: filename("css", "styles"),
    }),
  ];

  if (isProd) {
    base.push(
      new BundleAnalyzerPlugin(),
      // new FaviconsWebpackPlugin({
      //   logo: "./assets/images/favicon/favicon.svg",
      //   background: "#000",
      //   theme_color: "#000",
      //   display: "standalone",
      //   icons: {
      //     android: true,
      //     appleIcon: true,
      //     appleStartup: true,
      //     favicons: true,
      //     windows: true,

      //     yandex: true,
      //     firefox: true,
      //     coast: true,
      //   },
      // }),
      new ImageMinimizerPlugin({
        // filename: `${PATHS.assets}/images/[name][ext]`,
        minimizerOptions: {
          plugins: [
            ["gifsicle", { interlaced: true }],
            ["jpegtran", { progressive: true }],
            ["optipng", { optimizationLevel: 5 }],
            [
              "svgo",
              {
                plugins: [
                  {
                    removeViewBox: false,
                  },
                ],
              },
            ],
          ],
        },
      }),
      new CompressionPlugin({
        filename: "[path][base].gz",
        algorithm: "gzip",
        test: /\.js$|\.css$|\.html$/,
        threshold: 10240,
        minRatio: 0.8,
      }),
      new CompressionPlugin({
        filename: "[path][base].br",
        algorithm: "brotliCompress",
        test: /\.(js|css|html|svg)$/,
        compressionOptions: {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          },
        },
        threshold: 10240,
        minRatio: 0.8,
        deleteOriginalAssets: false,
      })
    );
  }

  return base;
};

module.exports = {
  context: path.resolve(__dirname, "src"),
  mode: "development",
  entry: {
    main: ["@babel/polyfill", "./js/index.js"],
  },
  output: {
    filename: filenameJs("js", "js"),
    path: path.resolve(__dirname, "dist"),
    publicPath: "",
  },
  resolve: {
    extensions: [".js", ".json", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimization: optimization(),
  devServer: {
    port: 4200,
    open: true,
    compress: true,
    hot: isDev,
  },
  devtool: isDev ? "source-map" : false,
  plugins: plugins(),
  experiments: {
    asset: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "../../",
            },
          },
          {
            loader: "css-loader",
            options: { sourceMap: true },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, "config/postcss.config.js"),
              },
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {},
          },
          {
            loader: "css-loader",
            options: { sourceMap: true },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, "config/postcss.config.js"),
              },
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: { sourceMap: true },
          },
        ],
      },
      {
        test: /\.(jpe?g|png|gif|svg|avif|webp)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/images/[name][ext]",
        },
        use: [
          {
            loader: ImageMinimizerPlugin.loader,
            options: {
              severityError: "warning",
              minimizerOptions: {
                plugins: ["gifsicle"],
              },
            },
          },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        type: "asset/resource",
        generator: {
          filename: "assets/fonts/[name]/[name].[contenthash].[ext]",
        },
      },
      {
        test: /\.js$/, //  Когда приложение загружается, это вызывает ошибку ERR_UNKNOWN_URL_SCHEME в консоли инструментов Chrome Dev. npm start,
        enforce: "pre",
        use: ["source-map-loader"],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: jsLoaders(),
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: babelOptions("@babel/preset-typescript"),
      },
      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: babelOptions("@babel/preset-react"),
      },

      // {
      //   test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
      //   type: 'asset/inline',
      // },
    ],
  },
};
