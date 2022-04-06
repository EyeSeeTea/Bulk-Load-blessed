import { AppSettings } from "../entities/AppSettings";

export type AppStorageType = "dataStore" | "constant";

export interface ConfigRepository {
    getAppStorage(): AppStorageType;
    getDefaultSettings(): AppSettings;
}
