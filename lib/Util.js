/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2018
 * @license GPL-3.0
 */

class AngeError extends Error {
    constructor(message) {
        super(message);
    }
}

class Util {

}

module.exports = Util;

/** @type {AngeError} */
module.exports.AngeError = AngeError;
