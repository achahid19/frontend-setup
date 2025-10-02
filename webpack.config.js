const path = require('path');

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
			}
		]
	},
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