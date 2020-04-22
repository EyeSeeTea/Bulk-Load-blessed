import { ReferenceObject } from "../entities/ReferenceObject";

export interface AppStorage {
    // Basic operations
    get<T extends object>(key: string, defaultValue: T): Promise<T>;
    set<T extends object>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    // Data operations
    loadDataById<T extends ReferenceObject>(key: string, id: string): Promise<T | undefined>;
    saveData<T extends ReferenceObject>(key: string, data: T): Promise<void>;
    removeDataById(key: string, id: string): Promise<void>;
}
