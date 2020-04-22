import { ConstantSettingsStorage } from "../data/ConstantSettingsStorage";
import { DataStoreSettingsStorage } from "../data/DataStoreSettingsStorage";
import { WebAppConfig } from "../data/WebAppConfig";
import { DhisInstance } from "./entities/DhisInstance";
import { AppConfig } from "./repositories/AppConfig";
import { AppStorage } from "./repositories/AppStorage";

export interface CompositionRootOptions {
    appConfig: AppConfig;
    dhisInstance: DhisInstance;
}

export class CompositionRoot {
    private static instance: CompositionRoot;
    public readonly appStorage: AppStorage;
    public readonly appConfig: AppConfig;
    public readonly dhisInstance: DhisInstance;

    private constructor({ appConfig, dhisInstance }: CompositionRootOptions) {
        this.appConfig = new WebAppConfig(appConfig as any);
        this.dhisInstance = dhisInstance;
        this.appStorage =
            this.appConfig.getAppStorage() === "dataStore"
                ? new DataStoreSettingsStorage(dhisInstance)
                : new ConstantSettingsStorage(dhisInstance);
    }

    public static initialize(options: CompositionRootOptions) {
        if (!CompositionRoot.instance) {
            CompositionRoot.instance = new CompositionRoot(options);
        }
    }

    public static getInstance(): CompositionRoot {
        if (!CompositionRoot.instance) throw new Error("Composition root has not been initialized");
        return CompositionRoot.instance;
    }
}
