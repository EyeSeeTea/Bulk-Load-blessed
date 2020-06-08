export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type GetArrayInnerType<T extends readonly any[]> = T[number];
