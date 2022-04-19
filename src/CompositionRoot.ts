import { ConfigWebRepository, JsonConfig } from "./data/ConfigWebRepository";
import { D2UsersRepository } from "./data/D2UsersRepository";
import { ExcelPopulateRepository } from "./data/ExcelPopulateRepository";
import { InstanceDhisRepository } from "./data/InstanceDhisRepository";
import { MigrationsAppRepository } from "./data/MigrationsAppRepository";
import { StorageConstantRepository } from "./data/StorageConstantRepository";
import { StorageDataStoreRepository } from "./data/StorageDataStoreRepository";
import { TemplateWebRepository } from "./data/TemplateWebRepository";
import { DhisInstance } from "./domain/entities/DhisInstance";
import { ConfigRepository } from "./domain/repositories/ConfigRepository";
import { ExcelRepository } from "./domain/repositories/ExcelRepository";
import { InstanceRepository } from "./domain/repositories/InstanceRepository";
import { MigrationsRepository } from "./domain/repositories/MigrationsRepository";
import { StorageRepository } from "./domain/repositories/StorageRepository";
import { TemplateRepository } from "./domain/repositories/TemplateRepository";
import { AnalyzeTemplateUseCase } from "./domain/usecases/AnalyzeTemplateUseCase";
import { ConvertDataPackageUseCase } from "./domain/usecases/ConvertDataPackageUseCase";
import { DeleteCustomTemplateUseCase } from "./domain/usecases/DeleteCustomTemplateUseCase";
import { DeleteThemeUseCase } from "./domain/usecases/DeleteThemeUseCase";
import { DownloadTemplateUseCase } from "./domain/usecases/DownloadTemplateUseCase";
import { GetCustomTemplatesUseCase } from "./domain/usecases/GetCustomTemplatesUseCase";
import { GetDataFormsForGenerationUseCase } from "./domain/usecases/GetDataFormsForGenerationUseCase";
import { GetDataFormsUseCase } from "./domain/usecases/GetDataFormsUseCase";
import { GetDefaultSettingsUseCase } from "./domain/usecases/GetDefaultSettingsUseCase";
import { GetFormDataPackageUseCase } from "./domain/usecases/GetFormDataPackageUseCase";
import { GetFormOrgUnitRootsUseCase } from "./domain/usecases/GetFormOrgUnitRootsUseCase";
import { GetGeneratedTemplatesUseCase } from "./domain/usecases/GetGeneratedTemplatesUseCase";
import { GetMigrationVersionsUseCase } from "./domain/usecases/GetMigrationVersionsUseCase";
import { GetOrgUnitRootsUseCase } from "./domain/usecases/GetOrgUnitRootsUseCase";
import { HasPendingMigrationsUseCase } from "./domain/usecases/HasPendingMigrationsUseCase";
import { ImportTemplateUseCase } from "./domain/usecases/ImportTemplateUseCase";
import { ListDataFormsUseCase } from "./domain/usecases/ListDataFormsUseCase";
import { ListLanguagesUseCase } from "./domain/usecases/ListLanguagesUseCase";
import { ListThemesUseCase } from "./domain/usecases/ListThemesUseCase";
import { PersistTemplatesFromStaticModulesUseCase } from "./domain/usecases/PersistTemplatesFromStaticModulesUseCase";
import { ReadSettingsUseCase } from "./domain/usecases/ReadSettingsUseCase";
import { RunMigrationsUseCase } from "./domain/usecases/RunMigrationsUseCase";
import { SaveCustomTemplateUseCase } from "./domain/usecases/SaveCustomTemplateUseCase";
import { SaveThemeUseCase } from "./domain/usecases/SaveThemeUseCase";
import { SearchUsersUseCase } from "./domain/usecases/SearchUsersUseCase";
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
    const migrations: MigrationsRepository = new MigrationsAppRepository(storage, dhisInstance);
    const usersRepository = new D2UsersRepository(dhisInstance);

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
            getDataFormsForGeneration: new GetDataFormsForGenerationUseCase(instance),
            get: new GetDataFormsUseCase(instance),
            persistFromStaticModules: new PersistTemplatesFromStaticModulesUseCase(templateManager, usersRepository),
            getCustom: new GetCustomTemplatesUseCase(templateManager),
            getGenerated: new GetGeneratedTemplatesUseCase(templateManager),
            delete: new DeleteCustomTemplateUseCase(templateManager),
            save: new SaveCustomTemplateUseCase(templateManager),
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
        migrations: getExecute({
            run: new RunMigrationsUseCase(migrations, usersRepository),
            getVersions: new GetMigrationVersionsUseCase(migrations),
            hasPending: new HasPendingMigrationsUseCase(migrations),
        }),
        users: getExecute({
            search: new SearchUsersUseCase(usersRepository),
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
