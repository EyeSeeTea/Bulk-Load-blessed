import { TemplateRepository } from "../repositories/TemplateRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class ListTemplatesUseCase {
    constructor(
        private instance: InstanceRepository,
        private templateRepository: TemplateRepository
    ) {}

    public async execute() {
        const dataSets = await this.instance.getDataSets();
        const programs = await this.instance.getPrograms();
        const themes = await this.templateRepository.listThemes();

        return { dataSets, programs, custom: [], themes };
    }
}
