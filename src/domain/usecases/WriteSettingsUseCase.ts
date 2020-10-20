import { UseCase } from "../../CompositionRoot";
import { StorageRepository } from "../repositories/StorageRepository";

export class WriteSettingsUseCase implements UseCase {
    constructor(private appStorage: StorageRepository) {}

    public async execute<T extends object>(key: string, value: T): Promise<void> {
        return this.appStorage.saveObject(key, value);
    }
}
