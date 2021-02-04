import { Codec, Either, oneOf } from "purify-ts";
import { Integer, IntegerFromString } from "purify-ts-extra-codec";

export const optionalSafe = <T>(codec: Codec<T>, defaultValue: T): Codec<T> => {
    const decode = (input: unknown): Either<string, T> => {
        if (input === undefined) return Either.of(defaultValue);
        return codec.decode(input);
    };

    // Need to force type due private _isOptional flag
    return { ...codec, decode, _isOptional: true } as Codec<T>;
};

export const integer = oneOf([Integer, IntegerFromString]);
