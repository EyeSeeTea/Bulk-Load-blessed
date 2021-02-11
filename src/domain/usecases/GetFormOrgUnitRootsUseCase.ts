import { UseCase } from "../../CompositionRoot";
import { DataFormType } from "../entities/DataForm";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetFormOrgUnitRootsUseCase implements UseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(type: DataFormType, id: string): Promise<string[]> {
        const formOrgUnits = await this.instance.getDataFormOrgUnits(type, id);
        const userOrgUnits = await this.instance.getUserOrgUnits();

        return formOrgUnits.filter(({ path }) => userOrgUnits.some(({ id }) => path.includes(id))).map(({ id }) => id);
    }
}
