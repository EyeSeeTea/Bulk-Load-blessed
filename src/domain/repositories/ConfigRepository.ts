import { AppSettings } from "../entities/AppSettings";
import { User } from "../entities/User";

export type AppStorageType = "dataStore" | "constant";

export interface ConfigRepository {
    getAppStorage(): AppStorageType;
    getDefaultSettings(): AppSettings;
}
