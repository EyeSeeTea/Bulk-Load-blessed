import { CompositionRoot } from "../../CompositionRoot";
import { StorageRepository } from "../repositories/StorageRepository";

export class WriteSettingsUseCase {
    private appStorage: StorageRepository;

    constructor() {
        this.appStorage = CompositionRoot.getInstance().appStorage;
    }

    public async execute<T extends object>(key: string, value: T): Promise<void> {
        return this.appStorage.set(key, value);
    }
}
