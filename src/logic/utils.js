import {createAjaxQueue} from './ajaxMultiQueue';

let ajaxQueue = createAjaxQueue(25);

/**
 * Gets from requestUrl a given JSON and calls back an anonymous function
 * @param requestUrl
 */
export function getJSON(requestUrl) {
    return new Promise(function (resolve, reject) {
        ajaxQueue.queue({
            dataType: 'json',
            url: requestUrl,
            success: (json) => resolve(json),
            fail: (reason) => reject(reason)
        });
    });
}

/**
 * Compares a given baseString with compareString and returns true if they are the same
 * @param baseString
 * @param compareString
 * @returns {boolean}
 */
export function stringEquals(baseString, compareString) {
    return baseString.toString().trim().toLowerCase() === compareString.toString().trim().toLowerCase();
}

/**
 * Palette of colors used in the sheet building
 * @type {string[]}
 */
export const colors = [
    'ffee58', 'ffca28', 'ffa726', 'ff7043',
    'e57373', 'f06292', 'ba68c8', '9575cd',
    '9fa8da', '90caf9', '90caf9', '80deea',
    '80cbc4', 'a5d6a7', 'c5e1a5', 'e6ee9c'
];