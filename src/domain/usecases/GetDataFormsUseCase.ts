import _ from "lodash";
import { UseCase } from "../../CompositionRoot";
import { DataForm } from "../entities/DataForm";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetDataFormsUseCase implements UseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(): Promise<DataForm[]> {
        const dataSets = await this.instance.getDataForms({ type: ["dataSets"] });
        const programs = await this.instance.getDataForms({ type: ["programs"] });
        const dataForms = _(dataSets)
            .concat(programs)
            .sortBy(dataForm => dataForm.name)
            .value();

        return dataForms;
    }
}
