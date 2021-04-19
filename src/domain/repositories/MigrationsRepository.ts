import { Debug } from "../entities/Debug";
import { DhisInstance } from "../entities/DhisInstance";
import { MigrationVersions } from "../entities/MigrationVersions";
import { StorageRepository } from "./StorageRepository";

export interface MigrationsRepositoryConstructor {
    new (storageRepository: StorageRepository, localInstance: DhisInstance): MigrationsRepository;
}

export interface MigrationsRepository {
    runMigrations(debug: Debug): Promise<void>;
    hasPendingMigrations(): Promise<boolean>;
    getAppVersion(): Promise<MigrationVersions>;
}
