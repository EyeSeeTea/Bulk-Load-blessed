import { ConfigWebRepository, JsonConfig } from "./data/ConfigWebRepository";
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
import { ConvertDataPackageUseCase } from "./domain/usecases/ConvertDataPackageUseCase";
import { DeleteThemeUseCase } from "./domain/usecases/DeleteThemeUseCase";
import { DownloadCustomTemplateUseCase } from "./domain/usecases/DownloadCustomTemplateUseCase";
import { DownloadTemplateUseCase } from "./domain/usecases/DownloadTemplateUseCase";
import { GetDefaultSettingsUseCase } from "./domain/usecases/GetDefaultSettingsUseCase";
import { GetFormDataPackageUseCase } from "./domain/usecases/GetFormDataPackageUseCase";
import { GetFormOrgUnitRootsUseCase } from "./domain/usecases/GetFormOrgUnitRootsUseCase";
import { GetOrgUnitRootsUseCase } from "./domain/usecases/GetOrgUnitRootsUseCase";
import { ImportTemplateUseCase } from "./domain/usecases/ImportTemplateUseCase";
import { ListDataFormsUseCase } from "./domain/usecases/ListDataFormsUseCase";
import { ListLanguagesUseCase } from "./domain/usecases/ListLanguagesUseCase";
import { ListThemesUseCase } from "./domain/usecases/ListThemesUseCase";
import { ReadSettingsUseCase } from "./domain/usecases/ReadSettingsUseCase";
import { SaveThemeUseCase } from "./domain/usecases/SaveThemeUseCase";
import { WriteSettingsUseCase } from "./domain/usecases/WriteSettingsUseCase";
import { D2Api } from "./types/d2-api";

export interface CompositionRootOptions {
    appConfig: JsonConfig;
    dhisInstance: DhisInstance;
    mockApi?: D2Api;
}

export class CompositionRoot {
    private static compositionRoot: CompositionRoot;
    private readonly instance: InstanceRepository;
    private readonly config: ConfigRepository;
    private readonly storage: StorageRepository;
    private readonly templateManager: TemplateRepository;
    private readonly excelReader: ExcelRepository;

    constructor({ appConfig, dhisInstance, mockApi }: CompositionRootOptions) {
        this.instance = new InstanceDhisRepository(dhisInstance, mockApi);
        this.config = new ConfigWebRepository(appConfig);
        this.storage =
            this.config.getAppStorage() === "dataStore"
                ? new StorageDataStoreRepository(dhisInstance, mockApi)
                : new StorageConstantRepository(dhisInstance, mockApi);
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
        return getExecute({
            getUserRoots: new GetOrgUnitRootsUseCase(this.instance),
            getRootsByForm: new GetFormOrgUnitRootsUseCase(this.instance),
        });
    }

    public get form() {
        return getExecute({
            getDataPackage: new GetFormDataPackageUseCase(this.instance),
            convertDataPackage: new ConvertDataPackageUseCase(this.instance),
        });
    }

    public get templates() {
        return getExecute({
            analyze: new AnalyzeTemplateUseCase(
                this.instance,
                this.templateManager,
                this.excelReader
            ),
            download: new DownloadTemplateUseCase(
                this.instance,
                this.templateManager,
                this.excelReader
            ),
            downloadCustom: new DownloadCustomTemplateUseCase(
                this.templateManager,
                this.excelReader,
                this.instance
            ),
            import: new ImportTemplateUseCase(
                this.instance,
                this.templateManager,
                this.excelReader
            ),
            list: new ListDataFormsUseCase(this.instance),
        });
    }

    public get themes() {
        return getExecute({
            list: new ListThemesUseCase(this.templateManager),
            save: new SaveThemeUseCase(this.templateManager),
            delete: new DeleteThemeUseCase(this.templateManager),
        });
    }

    public get settings() {
        return getExecute({
            getDefault: new GetDefaultSettingsUseCase(this.config),
            read: new ReadSettingsUseCase(this.storage),
            write: new WriteSettingsUseCase(this.storage),
        });
    }

    public get languages() {
        return getExecute({
            list: new ListLanguagesUseCase(this.instance),
        });
    }
}

function getExecute<UseCases extends Record<Key, UseCase>, Key extends keyof UseCases>(
    useCases: UseCases
): { [K in Key]: UseCases[K]["execute"] } {
    const keys = Object.keys(useCases) as Key[];
    const initialOutput = {} as { [K in Key]: UseCases[K]["execute"] };

    return keys.reduce((output, key) => {
        const useCase = useCases[key];
        const execute = useCase.execute.bind(useCase) as UseCases[typeof key]["execute"];
        output[key] = execute;
        return output;
    }, initialOutput);
}

export interface UseCase {
    execute: Function;
}
