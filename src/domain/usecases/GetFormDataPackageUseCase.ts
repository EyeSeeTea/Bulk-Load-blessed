import { DataPackage } from "../entities/DataPackage";
import { GetDataPackageParams, InstanceRepository } from "../repositories/InstanceRepository";

export class GetFormDataPackageUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute(params: GetDataPackageParams): Promise<DataPackage> {
        return this.instance.getDataPackage(params);
    }
}
