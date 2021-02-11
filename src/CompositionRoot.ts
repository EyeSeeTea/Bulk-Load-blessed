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

export function getCompositionRoot({ appConfig, dhisInstance, mockApi }: CompositionRootOptions) {
    const instance: InstanceRepository = new InstanceDhisRepository(dhisInstance, mockApi);
    const config: ConfigRepository = new ConfigWebRepository(appConfig);
    const storage: StorageRepository =
        config.getAppStorage() === "dataStore"
            ? new StorageDataStoreRepository(dhisInstance, mockApi)
            : new StorageConstantRepository(dhisInstance, mockApi);
    const templateManager: TemplateRepository = new TemplateWebRepository(storage);
    const excelReader: ExcelRepository = new ExcelPopulateRepository();

    return {
        orgUnits: getExecute({
            getUserRoots: new GetOrgUnitRootsUseCase(instance),
            getRootsByForm: new GetFormOrgUnitRootsUseCase(instance),
        }),
        form: getExecute({
            getDataPackage: new GetFormDataPackageUseCase(instance),
            convertDataPackage: new ConvertDataPackageUseCase(instance),
        }),
        templates: getExecute({
            analyze: new AnalyzeTemplateUseCase(instance, templateManager, excelReader),
            download: new DownloadTemplateUseCase(instance, templateManager, excelReader),
            import: new ImportTemplateUseCase(instance, templateManager, excelReader),
            list: new ListDataFormsUseCase(instance),
        }),
        themes: getExecute({
            list: new ListThemesUseCase(templateManager),
            save: new SaveThemeUseCase(templateManager),
            delete: new DeleteThemeUseCase(templateManager),
        }),
        settings: getExecute({
            getDefault: new GetDefaultSettingsUseCase(config),
            read: new ReadSettingsUseCase(storage),
            write: new WriteSettingsUseCase(storage),
        }),
        languages: getExecute({
            list: new ListLanguagesUseCase(instance),
        }),
    };
}

export type CompositionRoot = ReturnType<typeof getCompositionRoot>;

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
