const path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// This variable will be true for production builds
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
	/**
	 * inside this object we can configure how webpack
	 * is going to work with our projet, (e.g: compilation, bundle target...)
	 */
	mode: 'development',
	// specify entry and output files
	entry:	'./src/index.tsx', // relative path
	// tell wepack to use ts-loader to compile ts files
	module: {
		rules: [
			// object for each different rule
			{
				test: /\.tsx?$/,
				// use: 'ts-loader', // compiles the files passed on test
				use: [
					{
						loader: 'babel-loader', // runs second for JSX conversion.
					},
					{
						loader: 'ts-loader' // runs first for tsc types checking.
					}
				],
				include: [path.resolve(__dirname, 'src')] // where the files should be
			},
			{
				test: /\.(png|jpe?g|gif)$/i,
				use: [
					{
						loader: 'file-loader',
					},
				],
				include: [path.resolve(__dirname, 'src/assets')]
			},
			{
        		test: /\.css$/i,
        		use: [
          		// Loaders are applied in reverse order (from bottom to top)
          
          		// 3. In production, this extracts CSS to a file. In development, it injects styles into the DOM.
          		isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          
          		// 2. This loader resolves CSS imports and url() paths.
          		'css-loader',
          
          		// 1. This loader processes CSS with PostCSS (and Tailwind). THIS RUNS FIRST.
          		'postcss-loader',
        		],
      		},
		]
	},
	plugins: [
    	// This plugin is only added for production builds
    	isProduction && new MiniCssExtractPlugin({
      		filename: '[name].css',
    	}),
  	].filter(Boolean), // This trick removes any 'false' items from the array

	// this would resolve the imports in our entry file.
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.png'] // Allow imports without file extensions
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'public') // absolute path, so we need path resolver.
	},
	devServer: {
		static: {
			directory: path.join(__dirname, 'public'), // load data in memory here.
		},
		historyApiFallback: true,
		compress: true,
		port: 9000, // You can choose any port
		open: true, //
	}
}