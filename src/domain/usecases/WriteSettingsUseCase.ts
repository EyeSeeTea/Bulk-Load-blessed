import { StorageRepository } from "../repositories/StorageRepository";

export class WriteSettingsUseCase {
    constructor(private appStorage: StorageRepository) {}

    public async execute<T extends object>(key: string, value: T): Promise<void> {
        return this.appStorage.set(key, value);
    }
}
