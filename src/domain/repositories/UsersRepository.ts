import { User } from "../entities/User";

export interface UsersRepository {
    getCurrentUser(): Promise<User>;
}
