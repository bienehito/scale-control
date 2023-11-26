import path from "path"
import { fileURLToPath } from "url"
import CopyWebpackPlugin from "copy-webpack-plugin"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
	entry: './src/game.js',
	mode: 'development',
	output: {
		filename: 'game.js',
		path: path.resolve(__dirname, 'dist'),
	},
	plugins: [
		new CopyWebpackPlugin({
            patterns: [
                { from: 'public' }
            ]
        })
	],
	devtool: 'source-map',
	devServer: {
		port: 9000,
		hot: true,
	}
}
