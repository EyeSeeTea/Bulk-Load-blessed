import { InstanceRepository } from "../repositories/InstanceRepository";
import { DataFormType } from "../entities/DataForm";

export class GetFormOrgUnitRootsUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(type: DataFormType, id: string): Promise<string[]> {
        const roots = await this.instance.getDataFormOrgUnits(type, id);
        return roots.map(({ id }) => id);
    }
}
