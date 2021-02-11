import { isFunction } from "lodash";
import {
    array,
    Codec,
    date,
    Either,
    enumeration,
    exactly,
    intersect,
    Left,
    maybe,
    nonEmptyList,
    nullable,
    nullType,
    number,
    oneOf,
    optional,
    record,
    Right,
    string,
    unknown,
} from "purify-ts";
import {
    chainCodec,
    DateFromStringFormatOf,
    FormattedStringFromDate,
    Integer,
    IntegerFromString,
    JsonFromString,
    NonEmptyString,
    NumberFromString,
    NumberRangedIn,
    RegExpMatchedString,
    StringLengthRangedIn,
} from "purify-ts-extra-codec";

type DefaultValue<T> = T | (() => T);

const optionalSafe = <T>(codec: Codec<T>, defaultValue: DefaultValue<T>): Codec<T> => {
    const decode = (input: unknown): Either<string, T> => {
        if (input === undefined) {
            const value = isFunction(defaultValue) ? defaultValue() : defaultValue;
            return Either.of(value);
        } else {
            return codec.decode(input);
        }
    };

    // Need to force type due private _isOptional flag
    return { ...codec, decode, _isOptional: true } as Codec<T>;
};

const booleanFromString = Codec.custom<boolean>({
    decode: value => {
        if (String(value).toLowerCase() === "true") return Right(true);
        if (String(value).toLowerCase() === "false") return Right(false);
        return Left(`${value} is not a parsable boolean`);
    },
    encode: value => `${value}`,
});

// Short and long HEX color format
const colorRegExp = /^#[0-9a-fA-F]{3,6}$/;

// RFC2822 email format
const emailRegExp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

// Diego Perini (License: MIT)
const urlRegExp = /^(?:(?:https?:\/\/)?localhost(?::\d{2,5})?)$|(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/;

// DHIS2 valid uid
const dhis2Uid = /^[a-zA-Z]{1}[a-zA-Z0-9]{10}$/;

export const Schema = {
    object: Codec.interface,
    stringObject: JsonFromString,
    array,
    nonEmptyArray: nonEmptyList,
    dictionary: record,
    string,
    nonEmptyString: NonEmptyString,
    stringLength: StringLengthRangedIn,
    integer: oneOf([Integer, IntegerFromString]),
    number: oneOf([number, NumberFromString]),
    numberBetween: NumberRangedIn,
    boolean: booleanFromString,
    null: nullType,
    unknown,
    date,
    formattedDate: FormattedStringFromDate,
    stringDate: DateFromStringFormatOf,
    oneOf,
    optional,
    optionalSafe,
    nullable,
    enum: enumeration,
    exact: exactly,
    intersection: intersect,
    maybe,
    regex: RegExpMatchedString,
    color: RegExpMatchedString(colorRegExp),
    email: RegExpMatchedString(emailRegExp),
    url: RegExpMatchedString(urlRegExp),
    dhis2Id: RegExpMatchedString(dhis2Uid),
    chain: chainCodec,
    custom: Codec.custom,
};

export { parseError as parseSchemaError } from "purify-ts";
export type {
    Codec,
    DecodeError as SchemaDecodeError,
    FromType as GetTypeFromSchema,
    GetType as GetSchemaType,
} from "purify-ts";
