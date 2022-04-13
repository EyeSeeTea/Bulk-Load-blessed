import { UseCase } from "../../CompositionRoot";
import { Debug } from "../entities/Debug";
import { MigrationsRepository } from "../repositories/MigrationsRepository";
import { UsersRepository } from "../repositories/UsersRepository";

export class RunMigrationsUseCase implements UseCase {
    constructor(private migrationsRepository: MigrationsRepository, private usersRepository: UsersRepository) {}

    public async execute(debug: Debug): Promise<void> {
        const currentUser = await this.usersRepository.getCurrentUser();

        if (!currentUser.authorities.has("ALL")) {
            throw new Error("Only a user with authority ALL can run this migration");
        }

        await this.migrationsRepository.runMigrations(debug);
    }
}
