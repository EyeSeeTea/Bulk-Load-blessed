import { CompositionRoot } from "../CompositionRoot";
import { AppConfig } from "../repositories/AppConfig";
import { AppStorage } from "../repositories/AppStorage";

export class AppSettingsUseCase {
    private appStorage: AppStorage;
    private appConfig: AppConfig;

    constructor() {
        this.appStorage = CompositionRoot.getInstance().appStorage;
        this.appConfig = CompositionRoot.getInstance().appConfig;
    }

    public getDefaultSettings(): object {
        return this.appConfig.getDefaultSettings();
    }

    public async read<T extends object>(key: string, defaultValue: T): Promise<T> {
        return this.appStorage.get(key, defaultValue);
    }

    public async write<T extends object>(key: string, value: T): Promise<void> {
        return this.appStorage.set(key, value);
    }
}
