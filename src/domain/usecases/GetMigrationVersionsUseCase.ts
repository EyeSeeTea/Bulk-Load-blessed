import { UseCase } from "../../CompositionRoot";
import { MigrationVersions } from "../entities/MigrationVersions";
import { MigrationsRepository } from "../repositories/MigrationsRepository";

export class GetMigrationVersionsUseCase implements UseCase {
    constructor(private migrationsRepository: MigrationsRepository) {}

    public async execute(): Promise<MigrationVersions> {
        return this.migrationsRepository.getAppVersion();
    }
}
