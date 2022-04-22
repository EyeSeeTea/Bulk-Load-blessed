import { SearchResults, UsersRepository } from "../repositories/UsersRepository";

export class SearchUsersUseCase {
    constructor(private usersRepository: UsersRepository) {}

    execute(query: string): Promise<SearchResults> {
        return this.usersRepository.search(query);
    }
}
