import { UseCase } from "../../CompositionRoot";
import { StorageRepository } from "../repositories/StorageRepository";

export class ReadSettingsUseCase implements UseCase {
    constructor(private appStorage: StorageRepository) {}

    public async execute<T extends object>(key: string, defaultValue: T): Promise<T> {
        return this.appStorage.getObject(key, defaultValue);
    }
}
