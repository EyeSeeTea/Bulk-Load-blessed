import { InstanceRepository } from "../repositories/InstanceRepository";

export class ListDataFormsUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute() {
        const dataSet = await this.instance.getDataForms("dataSet");
        const program = await this.instance.getDataForms("program");

        return { dataSet, program, tracker: [] };
    }
}
