import { Debug } from "../domain/entities/Debug";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { MigrationVersions } from "../domain/entities/MigrationVersions";
import { MigrationsRepository } from "../domain/repositories/MigrationsRepository";
import { StorageRepository } from "../domain/repositories/StorageRepository";
import { D2Api } from "../types/d2-api";
import { cache } from "../utils/cache";
import { getD2APiFromInstance } from "../utils/d2-api";
import { promiseMap } from "../utils/promises";
import { MigrationsRunner } from "./migrations/client/MigrationsRunner";
import { AppStorage } from "./migrations/client/types";
import { getMigrationTasks, MigrationParams } from "./migrations/tasks";

export class MigrationsAppRepository implements MigrationsRepository {
    private d2Api: D2Api;

    constructor(private storageRepository: StorageRepository, localInstance: DhisInstance) {
        this.d2Api = getD2APiFromInstance(localInstance);
    }

    public async runMigrations(debug: Debug): Promise<void> {
        const runner = await this.getMigrationsRunner();
        await runner.setDebug(debug).execute();
    }

    public async hasPendingMigrations(): Promise<boolean> {
        const runner = await this.getMigrationsRunner();
        return runner.hasPendingMigrations();
    }

    public async getAppVersion(): Promise<MigrationVersions> {
        const runner = await this.getMigrationsRunner();
        return { appVersion: runner.appVersion, instanceVersion: runner.instanceVersion };
    }

    @cache()
    private async getMigrationsRunner(): Promise<MigrationsRunner<MigrationParams>> {
        const storage = await this.getStorageClient();
        const migrations = await promiseMap(getMigrationTasks(), async ([version, module_]) => {
            return { version, ...(await module_).default };
        });

        return MigrationsRunner.init<MigrationParams>({
            storage,
            debug: console.debug,
            migrations,
            migrationParams: { d2Api: this.d2Api },
        });
    }

    private async getStorageClient(): Promise<AppStorage> {
        return {
            get: <T extends object>(key: string) => this.storageRepository.getObjectIfExists<T>(key),
            getOrCreate: <T extends object>(key: string, defaultValue: T) =>
                this.storageRepository.getObject<T>(key, defaultValue),
            save: <T extends object>(key: string, value: T) => this.storageRepository.saveObject<T>(key, value),
            remove: (key: string) => this.storageRepository.removeObject(key),
            listKeys: () => this.storageRepository.listKeys(),
        };
    }
}
