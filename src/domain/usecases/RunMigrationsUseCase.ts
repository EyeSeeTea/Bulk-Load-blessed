import { UseCase } from "../../CompositionRoot";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { Debug } from "../entities/Debug";
import { DhisInstance } from "../entities/DhisInstance";
import { MigrationsRepository } from "../repositories/MigrationsRepository";

export class RunMigrationsUseCase implements UseCase {
    constructor(private migrationsRepository: MigrationsRepository, private localInstance: DhisInstance) {}

    public async execute(debug: Debug): Promise<void> {
        // TODO: Move to a new permissions repository
        const api = getD2APiFromInstance(this.localInstance);
        const currentUser = await api.currentUser.get({ fields: { authorities: true } }).getData();

        if (!currentUser.authorities.includes("ALL")) {
            throw new Error("Only a user with authority ALL can run this migration");
        }

        await this.migrationsRepository.runMigrations(debug);
    }
}
