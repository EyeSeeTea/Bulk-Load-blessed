import { UseCase } from "../../CompositionRoot";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class ListDataFormsUseCase implements UseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute() {
        const dataSets = await this.instance.getDataForms("dataSets");
        const programs = await this.instance.getDataForms("programs");
        return { dataSets, programs };
    }
}
