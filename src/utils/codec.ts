import _ from "lodash";
import { Codec, Either, oneOf } from "purify-ts";
import { Integer, IntegerFromString } from "purify-ts-extra-codec";

type DefaultValue<T> = T | (() => T);

export const optionalSafe = <T>(codec: Codec<T>, defaultValue: DefaultValue<T>): Codec<T> => {
    const decode = (input: unknown): Either<string, T> => {
        if (input === undefined) {
            const value = _.isFunction(defaultValue) ? defaultValue() : defaultValue;
            return Either.of(value);
        } else {
            return codec.decode(input);
        }
    };

    // Need to force type due private _isOptional flag
    return { ...codec, decode, _isOptional: true } as Codec<T>;
};

export const integer = oneOf([Integer, IntegerFromString]);
