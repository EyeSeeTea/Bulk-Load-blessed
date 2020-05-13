import { ConfigWebRepository } from "./data/ConfigWebRepository";
import { ExcelPopulateRepository } from "./data/ExcelPopulateRepository";
import { InstanceDhisRepository } from "./data/InstanceDhisRepository";
import { StorageConstantRepository } from "./data/StorageConstantRepository";
import { StorageDataStoreRepository } from "./data/StorageDataStoreRepository";
import { TemplateWebRepository } from "./data/TemplateWebRepository";
import { DhisInstance } from "./domain/entities/DhisInstance";
import { ConfigRepository } from "./domain/repositories/ConfigRepository";
import { ExcelRepository } from "./domain/repositories/ExcelRepository";
import { InstanceRepository } from "./domain/repositories/InstanceRepository";
import { StorageRepository } from "./domain/repositories/StorageRepository";
import { TemplateRepository } from "./domain/repositories/TemplateRepository";
import { AnalyzeTemplateUseCase } from "./domain/usecases/AnalyzeTemplateUseCase";
import { DeleteThemeUseCase } from "./domain/usecases/DeleteThemeUseCase";
import { DownloadCustomTemplateUseCase } from "./domain/usecases/DownloadCustomTemplateUseCase";
import { DownloadTemplateUseCase } from "./domain/usecases/DownloadTemplateUseCase";
import { GetDefaultSettingsUseCase } from "./domain/usecases/GetDefaultSettingsUseCase";
import { GetFormOrgUnitRootsUseCase } from "./domain/usecases/GetFormOrgUnitRootsUseCase";
import { GetOrgUnitRootsUseCase } from "./domain/usecases/GetOrgUnitRootsUseCase";
import { ListLanguagesUseCase } from "./domain/usecases/ListLanguagesUseCase";
import { ListTemplatesUseCase } from "./domain/usecases/ListTemplatesUseCase";
import { ListThemesUseCase } from "./domain/usecases/ListThemesUseCase";
import { ReadSettingsUseCase } from "./domain/usecases/ReadSettingsUseCase";
import { SaveThemeUseCase } from "./domain/usecases/SaveThemeUseCase";
import { WriteSettingsUseCase } from "./domain/usecases/WriteSettingsUseCase";

export interface CompositionRootOptions {
    appConfig: ConfigRepository;
    dhisInstance: DhisInstance;
}

export class CompositionRoot {
    private static compositionRoot: CompositionRoot;
    private readonly instance: InstanceRepository;
    private readonly config: ConfigRepository;
    private readonly storage: StorageRepository;
    private readonly templateManager: TemplateRepository;
    private readonly excelReader: ExcelRepository;

    private constructor({ appConfig, dhisInstance }: CompositionRootOptions) {
        this.instance = new InstanceDhisRepository(dhisInstance);
        this.config = new ConfigWebRepository(appConfig as any);
        this.storage =
            this.config.getAppStorage() === "dataStore"
                ? new StorageDataStoreRepository(dhisInstance)
                : new StorageConstantRepository(dhisInstance);
        this.templateManager = new TemplateWebRepository(this.storage);
        this.excelReader = new ExcelPopulateRepository();
    }

    public static initialize(options: CompositionRootOptions) {
        if (!CompositionRoot.compositionRoot) {
            CompositionRoot.compositionRoot = new CompositionRoot(options);
        }
    }

    public static attach(): CompositionRoot {
        if (!CompositionRoot.compositionRoot) {
            throw new Error("Composition root has not been initialized");
        }
        return CompositionRoot.compositionRoot;
    }

    public get orgUnits() {
        return {
            getRoots: new GetOrgUnitRootsUseCase(this.instance),
            getRootsByForm: new GetFormOrgUnitRootsUseCase(this.instance),
        };
    }

    public get templates() {
        return {
            analyze: new AnalyzeTemplateUseCase(this.instance, this.templateManager),
            download: new DownloadTemplateUseCase(
                this.instance,
                this.templateManager,
                this.excelReader
            ),
            downloadCustom: new DownloadCustomTemplateUseCase(
                this.templateManager,
                this.excelReader
            ),
            list: new ListTemplatesUseCase(this.instance),
        };
    }

    public get themes() {
        return {
            list: new ListThemesUseCase(this.templateManager),
            save: new SaveThemeUseCase(this.templateManager),
            delete: new DeleteThemeUseCase(this.templateManager),
        };
    }

    public get settings() {
        return {
            getDefault: new GetDefaultSettingsUseCase(this.config),
            read: new ReadSettingsUseCase(this.storage),
            write: new WriteSettingsUseCase(this.storage),
        };
    }

    public get languages() {
        return {
            list: new ListLanguagesUseCase(this.instance),
        };
    }
}
