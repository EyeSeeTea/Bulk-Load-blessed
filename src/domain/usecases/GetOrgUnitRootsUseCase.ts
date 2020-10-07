import { UseCase } from "../../CompositionRoot";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetOrgUnitRootsUseCase implements UseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(): Promise<string[]> {
        const roots = await this.instance.getUserOrgUnits();
        return roots.map(({ id }) => id);
    }
}
