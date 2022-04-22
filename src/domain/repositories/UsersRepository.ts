import { User } from "../entities/User";

export interface UsersRepository {
    search(query: string): Promise<SearchResults>;
    getCurrentUser(): Promise<User>;
}

export interface SearchResults {
    users: UserOrGroupRef[];
    userGroups: UserOrGroupRef[];
}

export interface UserOrGroupRef {
    id: string;
    displayName: string;
}
