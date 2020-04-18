import { ConfigRepository } from "../repositories/ConfigRepository";

export class GetDefaultSettingsUseCase {
    constructor(private appConfig: ConfigRepository) {}

    public execute(): object {
        return this.appConfig.getDefaultSettings();
    }
}
