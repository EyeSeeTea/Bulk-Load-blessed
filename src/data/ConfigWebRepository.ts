import { ConfigRepository, AppStorageType } from "../domain/repositories/ConfigRepository";

interface JsonConfig {
    appKey?: string;
    storage?: AppStorageType;
    defaultSettings?: object;
}

export class WebAppConfig implements ConfigRepository {
    constructor(private jsonConfig: JsonConfig) {}

    getAppKey(): string {
        return this.jsonConfig.appKey ?? "dhis-application";
    }

    getAppStorage(): AppStorageType {
        return this.jsonConfig.storage ?? "dataStore";
    }

    getDefaultSettings(): object {
        return this.jsonConfig.defaultSettings ?? {};
    }
}
