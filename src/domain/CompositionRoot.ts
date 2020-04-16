import { ConstantSettingsStorage } from "../data/ConstantSettingsStorage";
import { DataStoreSettingsStorage } from "../data/DataStoreSettingsStorage";
import { DefaultTemplateProvider } from "../data/DefaultTemplateProvider";
import { WebAppConfig } from "../data/WebAppConfig";
import { DhisInstance } from "./entities/DhisInstance";
import { AppConfig } from "./repositories/AppConfig";
import { AppStorage } from "./repositories/AppStorage";
import { TemplateProvider } from "./repositories/TemplateProvider";
import { DefaultThemeProvider } from "../data/DefaultThemeProvider";
import { ThemeProvider } from "./repositories/ThemeProvider";

export interface CompositionRootOptions {
    appConfig: AppConfig;
    dhisInstance: DhisInstance;
}

export class CompositionRoot {
    private static instance: CompositionRoot;
    public readonly appConfig: AppConfig;
    public readonly dhisInstance: DhisInstance;
    public readonly appStorage: AppStorage;
    public readonly templateProvider: TemplateProvider;
    public readonly themeProvider: ThemeProvider;

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
