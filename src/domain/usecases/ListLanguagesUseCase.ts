import { InstanceRepository } from "../repositories/InstanceRepository";

export class ListLanguagesUseCase {
    constructor(private instance: InstanceRepository) {}

    public async execute() {
        const locales = await this.instance.getLocales();

        return locales.map(({ locale, name }) => ({ value: locale, label: name }));
    }
}
