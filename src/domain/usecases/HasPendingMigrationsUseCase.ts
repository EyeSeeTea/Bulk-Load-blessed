import { UseCase } from "../../CompositionRoot";
import { MigrationsRepository } from "../repositories/MigrationsRepository";

export class HasPendingMigrationsUseCase implements UseCase {
    constructor(private migrationsRepository: MigrationsRepository) {}

    public async execute(): Promise<boolean> {
        return this.migrationsRepository.hasPendingMigrations();
    }
}
