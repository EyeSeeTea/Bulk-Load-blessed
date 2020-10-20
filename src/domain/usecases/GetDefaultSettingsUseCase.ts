import { UseCase } from "../../CompositionRoot";
import { AppSettings } from "../entities/AppSettings";
import { ConfigRepository } from "../repositories/ConfigRepository";

export class GetDefaultSettingsUseCase implements UseCase {
    constructor(private appConfig: ConfigRepository) {}

    public execute(): AppSettings {
        return this.appConfig.getDefaultSettings();
    }
}
