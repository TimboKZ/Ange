#! /usr/bin/env node

/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license MIT
 */

const cli = require('caporal');
const winston = require('winston');
const Promise = require('bluebird');

const packageData = require('../package.json');
const Ange = require('../lib/Ange');
const Util = require('../lib/Util');

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.colorize(),
        winston.format.simple()
    ),
    transports: [new winston.transports.Console()],
});
const ange = new Ange({logger});

cli.logger(logger);
cli.version(packageData.version);
cli
    .argument('[input]', 'Input file or directory (supports glob expressions)', cli.STRING, process.cwd())
    .argument('[output]', 'Output file (if input is also a file)', cli.STRING)
    .option('-r, --recursive', 'Discover input files recursively (if input is a directory)', cli.BOOL, false)
    .option('-w, --watch', 'Watch ', cli.BOOL, false)
    .action((args, options) => {
        Promise.resolve()
            .then(() => ange.run({input: args.input, output: args.output, recursive: options.recursive}))
            .catch(error => {
                if (error instanceof Util.AngeError) {
                    logger.error(error.message);
                } else {
                    // eslint-disable-next-line
                    console.error(error);
                }
                process.exit(1);
            });
    });

cli.parse(process.argv);
