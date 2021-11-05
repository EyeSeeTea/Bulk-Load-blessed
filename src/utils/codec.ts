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
