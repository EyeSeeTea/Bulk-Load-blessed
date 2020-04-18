import { ConstantSettingsStorage } from "./data/StorageConstantRepository";
import { DataStoreSettingsStorage } from "./data/StorageDataStoreRepository";
import { DefaultTemplateProvider } from "./data/TemplateWebRepository";
import { DefaultThemeProvider } from "./data/ThemeWebRepository";
import { WebAppConfig } from "./data/ConfigWebRepository";
import { DhisInstance } from "./domain/entities/DhisInstance";
import { ConfigRepository } from "./domain/repositories/ConfigRepository";
import { StorageRepository } from "./domain/repositories/StorageRepository";
import { TemplateRepository } from "./domain/repositories/TemplateRepository";
import { ThemeRepository } from "./domain/repositories/ThemeRepository";

export interface CompositionRootOptions {
    appConfig: ConfigRepository;
    dhisInstance: DhisInstance;
}

export class CompositionRoot {
    private static instance: CompositionRoot;
    public readonly appConfig: ConfigRepository;
    public readonly dhisInstance: DhisInstance;
    public readonly appStorage: StorageRepository;
    public readonly templateProvider: TemplateRepository;
    public readonly themeProvider: ThemeRepository;

    private constructor({ appConfig, dhisInstance }: CompositionRootOptions) {
        this.appConfig = new WebAppConfig(appConfig as any);
        this.dhisInstance = dhisInstance;
        this.appStorage =
            this.appConfig.getAppStorage() === "dataStore"
                ? new DataStoreSettingsStorage(dhisInstance)
                : new ConstantSettingsStorage(dhisInstance);
        this.templateProvider = new DefaultTemplateProvider();
        this.themeProvider = new DefaultThemeProvider(this.appStorage);
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
