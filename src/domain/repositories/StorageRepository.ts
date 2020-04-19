import { ReferenceObject } from "../entities/ReferenceObject";

export interface StorageRepository {
    // Object operations
    loadObject<T extends object>(key: string, defaultValue: T): Promise<T>;
    saveObject<T extends object>(key: string, value: T): Promise<void>;
    removeObject(key: string): Promise<void>;

    // Collection operations
    loadCollection<T extends ReferenceObject>(key: string, id: string): Promise<T | undefined>;
    saveCollection<T extends ReferenceObject>(key: string, data: T): Promise<void>;
    removeCollection(key: string, id: string): Promise<void>;
}
