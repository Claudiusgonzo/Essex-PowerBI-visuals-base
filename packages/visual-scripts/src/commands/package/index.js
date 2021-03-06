/**
 * Copyright (c) 2016 Uncharted Software Inc.
 * http://www.uncharted.software/
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict'
const mkdirp = require('mkdirp')
const chalk = require('chalk')
const config = require('../../config')
const writeOSSReport = require('./writeOSSReport')
const compileScripts = require('./compileScripts')
const bundle = require('./bundle')
const outputFolder = config.build.output.dir

module.exports = async () => {
	console.log(chalk.green('creating output folder %s', outputFolder))
	mkdirp.sync(outputFolder)
	console.log(chalk.green('webpacking scripts'))
	try {
		const { stats, result } = await compileScripts(config)
		console.log(chalk.green('writing OSS report'))
		await writeOSSReport(stats)
		console.log(chalk.green('zipping bundle'))
		await bundle(result, config)
	} catch (err) {
		console.log(chalk.red('build caught error', err))
	}
}
