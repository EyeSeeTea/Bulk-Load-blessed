import { D2Api, D2ApiDefault } from "d2-api";
import DataStore from "d2-api/api/dataStore";
import _ from "lodash";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { ReferenceObject } from "../domain/entities/ReferenceObject";
import { StorageRepository } from "../domain/repositories/StorageRepository";

const dataStoreNamespace = "bulk-load";

export class DataStoreSettingsStorage implements StorageRepository {
    private api: D2Api;
    private dataStore: DataStore;

    constructor({ url }: DhisInstance) {
        this.api = new D2ApiDefault({ baseUrl: url });
        this.dataStore = this.api.dataStore(dataStoreNamespace);
    }

    public async get<T extends object>(key: string, defaultValue: T): Promise<T> {
        const value = await this.dataStore.get<T>(key).getData();
        if (!value) await this.set(key, defaultValue);
        return value ?? defaultValue;
    }

    public async set<T extends object>(key: string, value: T): Promise<void> {
        await this.dataStore.save(key, value).getData();
    }

    public async delete(key: string): Promise<void> {
        try {
            await this.dataStore.delete(key).getData();
        } catch (error) {
            if (!error.response || error.response.status !== 404) {
                throw error;
            }
        }
    }

    public async loadDataById<T extends ReferenceObject>(
        key: string,
        id: string
    ): Promise<T | undefined> {
        const rawData = await this.get<T[]>(key, []);
        return _.find(rawData, element => element.id === id);
    }

    public async removeDataById(key: string, id: string): Promise<void> {
        const oldData = await this.get(key, [] as ReferenceObject[]);
        const newData = _.reject(oldData, { id });
        await this.set(key, newData);
    }

    public async saveData<T extends ReferenceObject>(key: string, element: T): Promise<void> {
        const oldData = await this.get(key, [] as ReferenceObject[]);
        const newData = _.uniqBy([...oldData, element], "id");
        await this.set(key, newData);
    }
}
