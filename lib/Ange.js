/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2018
 * @license GPL-3.0
 */

const fs = require('fs-extra');
const path = require('upath');
const ejs = require('ejs');

const Util = require('./Util');

/**
 * @enum {string}
 */
const InputType = {
    File: 'File',
    Directory: 'Directory',
};

class Ange {

    /**
     * @param {object} data
     * @param {Logger} data.logger
     */
    constructor(data) {
        this.logger = data.logger;
    }

    /**
     * @param {object} data
     * @param {string} data.input Input file or directory, required.
     * @param {string} [data.output] Output file, optional. Only used if input is also a file.
     * @param {bool} [data.recursive=false] Recursively discover input files (if input is a directory)
     */
    run(data) {
        const input = this.prepareInputFiles({
            input: data.input,
            recursive: data.recursive ? data.recursive : false,
        });

        if (input.type === InputType.File && data.output) {
            const rendered = this.renderEjsTemplate({templatePath: input.files[0]});
            const outputPath = path.resolve(process.cwd(), data.output);
            fs.writeFileSync(outputPath, rendered.string);
        }

        for (const inputFile of input.files) {
            const rendered = this.renderEjsTemplate({templatePath: inputFile});
            if (!rendered.output) {
                this.logger.warn(`Output path is ambiguous - skipping: ${inputFile}`);
                continue;
            }
            const outputPath = path.resolve(process.cwd(), rendered.output);
            fs.writeFileSync(outputPath, rendered.string);
        }
    }

    /**
     * Resolves `data.input` into an array of input files that need to be processed.
     *
     * @param {object} data
     * @param {string} data.input Input file or directory, required.
     * @param {bool} data.recursive
     * @returns {{type: InputType, files: string[]}}
     */
    prepareInputFiles(data) {
        const inputPath = path.resolve(process.cwd(), data.input);
        this.logger.debug(`Resolved input to: ${inputPath}`);
        if (!fs.pathExistsSync(inputPath)) throw new Util.AngeError(`Input path does not exist! (${data.input})`);

        const inputData = {};

        const stat = fs.lstatSync(inputPath);
        if (stat.isDirectory()) inputData.type = InputType.Directory;
        else if (stat.isFile()) inputData.type = InputType.File;
        else throw new Util.AngeError(`Specified input doesn't seem to be a directory nor a file. (${data.input})`);
        this.logger.debug(`Input type: ${inputData.type}`);

        if (inputData.type === InputType.File) {
            inputData.files = [inputPath];
        } else {
            inputData.files = this.discoverAngeInputFiles({directory: inputPath, recursive: data.recursive});
        }

        return inputData;
    }

    /**
     * Discovers files that have `.ange` somewhere in their names.
     *
     * @param {object} data
     * @param {string} data.directory Absolute path to directory
     * @param {bool} data.recursive
     */
    discoverAngeInputFiles(data) {
        const files = fs.readdirSync(data.directory);
        let inputFiles = [];
        for (const fileName of files) {
            const filePath = path.join(data.directory, fileName);
            const stat = fs.lstatSync(filePath);

            if (stat.isFile() && fileName.includes('.ange')) {
                inputFiles.push(filePath);
            } else if (data.recursive && stat.isDirectory()) {
                const newInputFiles = this.discoverAngeInputFiles({directory: filePath, recursive: data.recursive});
                inputFiles = inputFiles.concat(newInputFiles);
            }
        }
        return inputFiles;
    }

    /**
     * @param {object} data
     * @param {string} data.templatePath Absolute path to template
     * @returns {{output?: string, string: string}}
     */
    renderEjsTemplate(data) {
        if (!this._outputLineRegex) {
            // Matches (with arbitrary spaces):
            //     <%// output: <path> -%>
            //     OR
            //     <%// output: <path> %>
            this._outputLineRegex = /^\s*<%#\s*output:\s*([^\s]+)\s*-?%>/i;
        }

        const template = fs.readFileSync(data.templatePath).toString();
        const templateDir = path.dirname(data.templatePath);
        const templateFileName = path.basename(data.templatePath);
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
