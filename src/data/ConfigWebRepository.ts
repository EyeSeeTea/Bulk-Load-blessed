import { AppSettings } from "../domain/entities/AppSettings";
import { AppStorageType, ConfigRepository } from "../domain/repositories/ConfigRepository";

export interface JsonConfig {
    appKey?: string;
    storage?: AppStorageType;
    defaultSettings?: AppSettings;
}

export class ConfigWebRepository implements ConfigRepository {
    constructor(private jsonConfig: JsonConfig) {}

    getAppKey(): string {
        return this.jsonConfig.appKey ?? "dhis-application";
    }

    getAppStorage(): AppStorageType {
        return this.jsonConfig.storage ?? "dataStore";
    }

    getDefaultSettings(): AppSettings {
        const defaultSettings = this.jsonConfig.defaultSettings ?? {};
        return {
            models: {
                dataSet: true,
                program: true,
            },
            permissionsForGeneration: [],
            permissionsForSettings: [],
            permissionsForImport: [],
            orgUnitSelection: "both",
            duplicateEnabled: true,
            duplicateExclusion: {},
            duplicateTolerance: 1,
            duplicateToleranceUnit: "day",
            ...defaultSettings,
        };
    }
}
