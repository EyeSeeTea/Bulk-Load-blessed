import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetOrgUnitRootsUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(): Promise<string[]> {
        const roots = await this.instance.getUserOrgUnits();
        return roots.map(({ id }) => id);
    }
}
