import { D2Api, D2ApiDefault } from "d2-api";
import DataStore from "d2-api/api/dataStore";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { StorageRepository } from "../domain/repositories/StorageRepository";

const dataStoreNamespace = "bulk-load";

export class StorageDataStoreRepository extends StorageRepository {
    private api: D2Api;
    private dataStore: DataStore;

    constructor({ url }: DhisInstance) {
        super();
        this.api = new D2ApiDefault({ baseUrl: url });
        this.dataStore = this.api.dataStore(dataStoreNamespace);
    }

    public async getObject<T extends object>(key: string, defaultValue: T): Promise<T> {
        const value = await this.dataStore.get<T>(key).getData();
        if (!value) await this.saveObject(key, defaultValue);
        return value ?? defaultValue;
    }

    public async saveObject<T extends object>(key: string, value: T): Promise<void> {
        await this.dataStore.save(key, value).getData();
    }

    public async removeObject(key: string): Promise<void> {
        try {
            await this.dataStore.delete(key).getData();
        } catch (error) {
            if (!error.response || error.response.status !== 404) {
                throw error;
            }
        }
    }
}
