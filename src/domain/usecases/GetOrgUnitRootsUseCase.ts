import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetOrgUnitRootsUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(): Promise<string[]> {
        const roots = await this.instance.getOrgUnitRoots();
        return roots.map(({ id }) => id);
    }
}
