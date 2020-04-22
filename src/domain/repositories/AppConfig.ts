export type AppStorageType = "dataStore" | "constant";

export interface AppConfig {
    getAppStorage(): AppStorageType;
    getDefaultSettings(): object;
}
