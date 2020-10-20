import { UseCase } from "../../CompositionRoot";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class ListLanguagesUseCase implements UseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute() {
        const locales = await this.instance.getLocales();

        return locales.map(({ locale, name }) => ({ value: locale, label: name }));
    }
}
