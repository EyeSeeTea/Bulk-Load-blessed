import { CompositionRoot } from "../../CompositionRoot";
import { ConfigRepository } from "../repositories/ConfigRepository";

export class GetDefaultSettingsUseCase {
    private appConfig: ConfigRepository;

    constructor() {
        this.appConfig = CompositionRoot.getInstance().appConfig;
    }

    public execute(): object {
        return this.appConfig.getDefaultSettings();
    }
}
