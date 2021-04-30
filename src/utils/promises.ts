//@ts-ignore
import PromisePool from "async-promise-pool";

interface RunPromisesOptions {
    concurrency: number;
}

export function runPromises<T>(
    promiseGetters: Array<() => Promise<T>>,
    options: Partial<RunPromisesOptions> = {}
): Promise<T[]> {
    const finalOptions = { concurrency: 1, ...options };
    const pool = new PromisePool(finalOptions);
    promiseGetters.forEach(promiseGetter => pool.add(promiseGetter));
    return pool.all();
}

export const timeout = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/* Map sequentially over T[] with an asynchronous function and return array of mapped values */
export async function promiseMap<T, S>(
    inputValues: T[],
    mapper: (value: T, index: number) => Promise<S>
): Promise<S[]> {
    const output: S[] = [];
    let index = 0;

    for (const value of inputValues) {
        const res = await mapper(value, index++);
        output.push(res);
    }

    return output;
}
