/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license MIT
 */

const ejs = require('ejs');
const eol = require('eol');
const path = require('upath');
const fs = require('fs-extra');
const fg = require('fast-glob');
const Promise = require('bluebird');
const chokidar = require('chokidar');
const micromatch = require('micromatch');
const detectNewline = require('detect-newline');

/**
 * @enum {string}
 */
const InputType = {
    File: 'File',
    Glob: 'Glob',
};

class Ange {

    /**
     * @param {object} data
     * @param {winston.Logger} data.logger
     */
    constructor(data) {
        this.logger = data.logger;
    }

    /**
     * @param {object} data
     * @param {string} data.input Input file or directory, required.
     * @param {string} [data.output] Output file, optional. Only used if input is also a file.
     * @param {boolean} [data.recursive=false] Recursively discover input files (if input is a directory)
     * @param {boolean} [data.watch=false] Watch input for changes
     */
    run(data) {
        const recursive = data.recursive === true;
        const watch = data.watch === true;

        let glob;
        const absoluteInputPath = path.resolve(data.input);
        if (fs.pathExists(absoluteInputPath)) {
            const stats = fs.statSync(absoluteInputPath);
            if (stats.isDirectory()) {
                const nameExpr = '*.ange(.*|)';
                glob = recursive ? path.join(data.input, '**', nameExpr) : path.join(data.input, nameExpr);
            }
        } else {
            glob = data.input;
        }

        let outputOverride;
        if (data.output) {
            if (!glob) {
                outputOverride = path.resolve(data.output);
            } else {
                this.logger.warn('You specified an output path, but the input isn\'t a path to a single file.'
                    + ' The output path option will be ignored.');
            }
        }

        if (watch) {
            const compile = (filePath) => {
                if (!micromatch.isMatch(filePath, glob)) return;
                this.logger.info(`Compiling ${filePath}...`);
                this.compileFile(path.resolve(filePath), outputOverride)
                    .catch(error => this.logger.error(`Error occurred while compiling "${filePath}":`, error));
            };
            const watcher = chokidar.watch(glob ? glob : absoluteInputPath, {awaitWriteFinish: true});
            watcher.on('add', compile);
            watcher.on('change', compile);
            this.logger.info(`Watching "${glob}" for changes...`);
            return Promise.resolve();
        } else {
            if (glob) {
                return fg(glob, {filesOnly: true}).then(entries => {
                    const absolutePaths = entries.map(e => path.resolve(e));
                    return this.compileFiles(absolutePaths);
                });
            } else {
                return this.compileFile(absoluteInputPath, outputOverride);
            }
        }

    }

    /**
     * Resolves `data.input` into an array of input files that need to be processed.
     *
     * @param {object} data
     * @param {string} data.input Input file or directory, required.
     * @param {boolean} data.recursive
     * @returns {Promise.<{type: InputType, files: string[]}>}
     */
    prepareInputFiles(data) {
        const inputPath = path.resolve(data.input);

        this.logger.debug(`Resolved input to: ${inputPath}`);
        if (!fs.pathExistsSync(inputPath)) {
            // The input is probably a glob expression
            return fg(data.input, {filesOnly: true})
                .then(entries => ({type: InputType.Glob, files: entries.map(e => path.resolve(e))}));
        }

        const stat = fs.lstatSync(inputPath);
        if (stat.isDirectory()) {
            const anglePattern = '*.ange(.*|)';
            const expression = data.recursive ? path.join(data.input, '**', anglePattern) : path.join(data.input, anglePattern);
            return fg(expression, {filesOnly: true})
                .then(entries => ({type: InputType.Glob, files: entries.map(e => path.resolve(e))}));
        }

        return Promise.resolve({type: InputType.File, files: [inputPath]});
    }

    /**
     * @param {string[]} templatePaths
     */
    compileFiles(templatePaths) {
        const promises = new Array(templatePaths.length);
        for (let i = 0; i < templatePaths.length; ++i) {
            promises[i] = this.compileFile(templatePaths[i]);
        }
        return Promise.all(promises);
    }

    /**
     * @param {string} templatePath
     * @param {string} [overrideOutput]
     */
    compileFile(templatePath, overrideOutput) {
        return fs.readFile(templatePath, 'utf8')
            .then(template => {
                const render = this.renderEjsTemplate(templatePath, template);
                const output = overrideOutput ? overrideOutput : render.output;
                if (!output) {
                    this.logger.warn(`Output path is ambiguous - skipping: ${templatePath}`);
                    return;
                }

                const lineEnding = detectNewline(template);
                const eolFunc = lineEnding === '\n' ? eol.lf : eol.auto;
                return fs.writeFile(output, eolFunc(render.string), 'utf8');
            });
    }

    /**
     * @param {string} templatePath Absolute path to template
     * @param {string} template Template as as tring
     * @returns {{output?: string, string: string}}
     */
    renderEjsTemplate(templatePath, template) {
        if (!this._outputLineRegex) {
            // Matches (with arbitrary spaces):
            //     <%// output: <path> -%>
            //     OR
            //     <%// output: <path> %>
            this._outputLineRegex = /^\s*<%#\s*output:\s*([^\s]+)\s*-?%>/i;
        }

        const templateDir = path.dirname(templatePath);
        const templateFileName = path.basename(templatePath);
        const outputMatch = this._outputLineRegex.exec(template);

        const specialRequire = requirePath => {
            if (!requirePath.startsWith('.')) return require(requirePath);
            return require(path.resolve(templateDir, requirePath));
        };

        let output = outputMatch ? path.resolve(templateDir, outputMatch[1]) : null;
        if (!output && templateFileName.includes('.ange')) {
            output = path.resolve(templateDir, templateFileName.replace('.ange', ''));
        }
        const string = ejs.render(template, {require: specialRequire});

        return {
            output,
            string,
        };
    }

}

module.exports = Ange;
