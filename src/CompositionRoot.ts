import { ConfigWebRepository } from "./data/ConfigWebRepository";
import { ExcelPopulateRepository } from "./data/ExcelPopulateRepository";
import { StorageConstantRepository } from "./data/StorageConstantRepository";
import { StorageDataStoreRepository } from "./data/StorageDataStoreRepository";
import { TemplateWebRepository } from "./data/TemplateWebRepository";
import { ThemeWebRepository } from "./data/ThemeWebRepository";
import { DhisInstance } from "./domain/entities/DhisInstance";
import { ConfigRepository } from "./domain/repositories/ConfigRepository";
import { ExcelRepository } from "./domain/repositories/ExcelRepository";
import { StorageRepository } from "./domain/repositories/StorageRepository";
import { TemplateRepository } from "./domain/repositories/TemplateRepository";
import { ThemeRepository } from "./domain/repositories/ThemeRepository";
import { DownloadTemplateUseCase } from "./domain/usecases/DownloadTemplateUseCase";
import { GetDefaultSettingsUseCase } from "./domain/usecases/GetDefaultSettingsUseCase";
import { ListTemplatesUseCase } from "./domain/usecases/ListTemplatesUseCase";
import { ReadSettingsUseCase } from "./domain/usecases/ReadSettingsUseCase";
import { WriteSettingsUseCase } from "./domain/usecases/WriteSettingsUseCase";

export interface CompositionRootOptions {
    appConfig: ConfigRepository;
    dhisInstance: DhisInstance;
}

export class CompositionRoot {
    private static instance: CompositionRoot;
    private readonly config: ConfigRepository;
    private readonly storage: StorageRepository;
    private readonly templateProvider: TemplateRepository;
    private readonly themeProvider: ThemeRepository;
    private readonly excelReader: ExcelRepository;

    private constructor({ appConfig, dhisInstance }: CompositionRootOptions) {
        this.config = new ConfigWebRepository(appConfig as any);
        this.storage =
            this.config.getAppStorage() === "dataStore"
                ? new StorageDataStoreRepository(dhisInstance)
                : new StorageConstantRepository(dhisInstance);
        this.templateProvider = new TemplateWebRepository();
        this.themeProvider = new ThemeWebRepository(this.storage);
        this.excelReader = new ExcelPopulateRepository();
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

    public get template() {
        return {
            download: new DownloadTemplateUseCase(this.templateProvider, this.excelReader).execute,
            list: new ListTemplatesUseCase(this.templateProvider).execute,
        };
    }

    public get settings() {
        return {
            getDefault: new GetDefaultSettingsUseCase(this.config).execute,
            read: new ReadSettingsUseCase(this.storage).execute,
            write: new WriteSettingsUseCase(this.storage).execute,
        };
    }
}
