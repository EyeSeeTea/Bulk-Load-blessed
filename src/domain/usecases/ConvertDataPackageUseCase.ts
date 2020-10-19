import { UseCase } from "../../CompositionRoot";
import { DataPackage } from "../entities/DataPackage";
import { AggregatedPackage, EventsPackage } from "../entities/DhisDataPackage";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class ConvertDataPackageUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public execute(dataPackage: DataPackage): AggregatedPackage | EventsPackage {
        return this.instanceRepository.convertDataPackage(dataPackage);
    }
}
