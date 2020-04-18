import { CompositionRoot } from "../../CompositionRoot";
import { StorageRepository } from "../repositories/StorageRepository";

export class ReadSettingsUseCase {
    private appStorage: StorageRepository;

    constructor() {
        this.appStorage = CompositionRoot.getInstance().appStorage;
    }

    public async execute<T extends object>(key: string, defaultValue: T): Promise<T> {
        return this.appStorage.get(key, defaultValue);
    }
}
