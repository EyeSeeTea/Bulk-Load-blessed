import { AppSettings } from "../entities/AppSettings";
import { ConfigRepository } from "../repositories/ConfigRepository";

export class GetDefaultSettingsUseCase {
    constructor(private appConfig: ConfigRepository) {}

    public execute(): AppSettings {
        return this.appConfig.getDefaultSettings();
    }
}
