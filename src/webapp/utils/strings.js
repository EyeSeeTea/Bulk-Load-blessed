/**
 * Compares a given baseString with compareString and returns true if they are the same
 * @param baseString
 * @param compareString
 * @returns {boolean}
 */
export function stringEquals(baseString, compareString) {
    return baseString.toString().trim().toLowerCase() === compareString.toString().trim().toLowerCase();
}
