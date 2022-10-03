import { User } from "../entities/User";
import { UsersRepository } from "../repositories/UsersRepository";

export class GetCurrentUserUseCase {
    constructor(private usersRepository: UsersRepository) {}

    execute(): Promise<User> {
        return this.usersRepository.getCurrentUser();
    }
}
