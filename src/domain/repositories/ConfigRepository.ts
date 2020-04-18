export type AppStorageType = "dataStore" | "constant";

export interface ConfigRepository {
    getAppStorage(): AppStorageType;
    getDefaultSettings(): object;
}
