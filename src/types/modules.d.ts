declare module "d2" {
    export function init(config: { baseUrl: string; headers?: any; schemas?: string[] }): unknown;
}

declare module "d2/uid" {
    export function generateUid(): string;
    export function isValidUid(uid: string): boolean;
}

declare module "@dhis2/d2-i18n" {
    export function t(value: string): string;
    export function t(value: string, options?: { [key: string]: any }): string;
    export function changeLanguage(locale: string);
    export function setDefaultNamespace(namespace: string);
}

declare module "nano-memoize" {
    export default function memoize<T extends Function>(
        func: T,
        options?: {
            /**
             * Only use the provided maxArgs for cache look-up, useful for ignoring final callback arguments
             */
            maxArgs?: number;
            /**
             * Number of milliseconds to cache a result, set to `Infinity` to never create timers or expire
             */
            maxAge?: number;
            /**
             * The serializer/key generator to use for single argument functions (optional, not recommended)
             * must be able to serialize objects and functions, by default a WeakMap is used internally without serializing
             */
            serializer?: (...args: any[]) => any;
            /**
             * the equals function to use for multi-argument functions (optional, try to avoid) e.g. deepEquals for objects
             */
            equals?: (...args: any[]) => boolean;
            /**
             * Forces the use of multi-argument paradigm, auto set if function has a spread argument or uses `arguments` in its body.
             */
            vargs?: boolean;
        }
    ): T;
}

declare module "json-stringify-deterministic" {
    export default function stringify(obj: any): string;
}
