import { StorageRepository } from "../repositories/StorageRepository";

export class ReadSettingsUseCase {
    constructor(private appStorage: StorageRepository) {}

    public async execute<T extends object>(key: string, defaultValue: T): Promise<T> {
        return this.appStorage.loadObject(key, defaultValue);
    }
}
