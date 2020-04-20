import { ReferenceObject } from "../entities/ReferenceObject";

export interface StorageRepository {
    // Object operations
    getObject<T extends object>(key: string, defaultValue: T): Promise<T>;
    saveObject<T extends object>(key: string, value: T): Promise<void>;
    removeObject(key: string): Promise<void>;

    // Collection operations
    listObjectsInCollection<T extends ReferenceObject>(key: string): Promise<T[]>;
    getObjectInCollection<T extends ReferenceObject>(
        key: string,
        id: string
    ): Promise<T | undefined>;
    saveObjectInCollection<T extends ReferenceObject>(key: string, data: T): Promise<void>;
    removeObjectInCollection(key: string, id: string): Promise<void>;
}
