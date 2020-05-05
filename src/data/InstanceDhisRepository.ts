import { InstanceRepository } from "../domain/repositories/InstanceRepository";
import { DataSet } from "../domain/entities/DataSet";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { D2ApiDefault, D2Api } from "d2-api";
import { Program } from "../domain/entities/Program";

export class InstanceDhisRepository implements InstanceRepository {
    private api: D2Api;

    constructor({ url }: DhisInstance) {
        this.api = new D2ApiDefault({ baseUrl: url });
    }

    public async getDataSets(): Promise<DataSet[]> {
        const { objects } = await this.api.models.dataSets
            .get({ paging: false, fields: { id: true, displayName: true, name: true } })
            .getData();
        return objects.map(({ id, displayName, name }) => ({ id, name: displayName ?? name }));
    }

    public async getPrograms(): Promise<Program[]> {
        const { objects } = await this.api.models.programs
            .get({ paging: false, fields: { id: true, displayName: true, name: true } })
            .getData();
        return objects.map(({ id, displayName, name }) => ({ id, name: displayName ?? name }));
    }
}
