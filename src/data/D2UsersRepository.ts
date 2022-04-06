import { D2Api } from "@eyeseetea/d2-api/2.33";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { User } from "../domain/entities/User";
import { UsersRepository } from "../domain/repositories/UsersRepository";
import { D2ApiDefault } from "../types/d2-api";

export class D2UsersRepository implements UsersRepository {
    private api: D2Api;

    constructor(localInstance: DhisInstance) {
        this.api = new D2ApiDefault({ baseUrl: localInstance.url });
    }

    async getCurrentUser(): Promise<User> {
        const apiUser = await this.api.currentUser
            .get({
                fields: {
                    id: true,
                    name: true,
                    userCredentials: { username: true },
                    authorities: true,
                },
            })
            .getData();

        return {
            id: apiUser.id,
            name: apiUser.name,
            username: apiUser.userCredentials.username,
            authorities: apiUser.authorities,
        };
    }
}
