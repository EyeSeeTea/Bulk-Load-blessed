import { D2Api } from "@eyeseetea/d2-api/2.33";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { User } from "../domain/entities/User";
import { SearchResults, UsersRepository } from "../domain/repositories/UsersRepository";
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
                    userGroups: { id: true, name: true },
                    authorities: true,
                },
            })
            .getData();

        return {
            id: apiUser.id,
            name: apiUser.name,
            username: apiUser.userCredentials.username,
            authorities: new Set(apiUser.authorities),
            userGroups: apiUser.userGroups,
        };
    }

    search(query: string): Promise<SearchResults> {
        const options = {
            fields: { id: true, displayName: true },
            filter: { displayName: { ilike: query } },
        };

        return this.api.metadata.get({ users: options, userGroups: options }).getData();
    }
}
