/* Map sequentially over T[] with an asynchronous function and return array of mapped values */
export function promiseMap<T, S>(inputValues: T[], mapper: (value: T, index: number) => Promise<S>): Promise<S[]> {
    const reducer = (acc$: Promise<S[]>, inputValue: T, index: number): Promise<S[]> =>
        acc$.then((acc: S[]) =>
            mapper(inputValue, index).then(result => {
                acc.push(result);
                return acc;
            })
        );
    return inputValues.reduce(reducer, Promise.resolve([]));
}
