import { InstanceRepository } from "../repositories/InstanceRepository";

export class ListTemplatesUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute() {
        const dataSets = await this.instance.getDataSets();
        const programs = await this.instance.getPrograms();

        return { dataSets, programs, custom: [] };
    }
}
