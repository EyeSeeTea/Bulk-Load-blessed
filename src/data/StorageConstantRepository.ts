import { D2Api, D2ApiDefault } from "d2-api";
import { generateUid } from "d2/uid";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { StorageRepository } from "../domain/repositories/StorageRepository";

interface Constant {
    id: string;
    code: string;
    name: string;
    description: string;
}

const defaultName = "Bulk Load Storage";

export class StorageConstantRepository extends StorageRepository {
    private api: D2Api;

    constructor({ url }: DhisInstance, mockApi?: D2Api) {
        super();
        this.api = mockApi ?? new D2ApiDefault({ baseUrl: url });
    }

    private buildDefault<T extends object>(key: string, value: T): Constant {
        return {
            id: generateUid(),
            code: key,
            name: `${defaultName} - ${key}`,
            description: JSON.stringify(value, null, 2),
        };
    }

    private async getConstant(key: string): Promise<Partial<Constant>> {
        const { objects: constants } = await this.api.models.constants
            .get({
                paging: false,
                fields: { id: true, code: true, name: true, description: true },
                filter: { code: { eq: key } },
            })
            .getData();

        return constants[0] ?? {};
    }

    public async getObject<T extends object>(key: string, defaultValue: T): Promise<T> {
        const { description } = await this.getConstant(key);
        if (!description) {
            await this.api.models.constants.post(this.buildDefault(key, defaultValue)).getData();
        }
        return description ? JSON.parse(description) : defaultValue;
    }

    public async saveObject<T extends object>(key: string, value: T): Promise<void> {
        const { id = generateUid(), name = `${defaultName} - ${key}` } = await this.getConstant(
            key
        );

        const response = await this.api.models.constants
            .put({ id, name, code: key, description: JSON.stringify(value, null, 4) })
            .getData();

        if (response.status !== "OK") {
            throw new Error(JSON.stringify(response.message, null, 2));
        }
    }

    public async removeObject(key: string): Promise<void> {
        const { id } = await this.getConstant(key);
        if (id) await this.api.models.constants.delete({ id }).getData();
    }
}
