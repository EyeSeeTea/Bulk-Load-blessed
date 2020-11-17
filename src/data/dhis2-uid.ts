import _ from "lodash";
import md5 from "md5";

/* DHIS UID pseudo-random (an input string returns always the same UID) generator. */

// DHIS2 UID :: /^[a-zA-Z]{1}[a-zA-Z0-9]{10}$/
const uidRegExp = /^[a-zA-Z]{1}[a-zA-Z0-9]{10}$/;
const asciiLetters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const asciiNumbers = "0123456789";
const asciiLettersAndNumbers = asciiLetters + asciiNumbers;
const uidStructure = [asciiLetters, ...repeat(asciiLettersAndNumbers, 10)];
const maxHashValue = _(uidStructure)
    .map(cs => cs.length)
    .reduce((acc, n) => acc * n, 1);

export function isValidUid(id: string): boolean {
    return !!id.match(uidRegExp);
}

/* Return UID from key (empty seed by default). If key is a valid DHIS" UID, just return it  */
export function getUid(id: string, seed = ""): string {
    if (isValidUid(id)) return id;

    const md5hash = md5(id + seed);
    const nHashChars = Math.ceil(Math.log(maxHashValue) / Math.log(16));
    const hashInteger = parseInt(md5hash.slice(0, nHashChars), 16);
    const result = uidStructure.reduce(
        (acc, chars) => {
            const { n, uid } = acc;
            const nChars = chars.length;
            const quotient = Math.floor(n / nChars);
            const remainder = n % nChars;
            const uidChar = chars[remainder];
            return { n: quotient, uid: uid + uidChar };
        },
        { n: hashInteger, uid: "" }
    );

    return result.uid;
}

function repeat<T>(value: T, n: number): T[] {
    return _.flatten(_.times(n, _.constant([value])));
}
