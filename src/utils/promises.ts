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
