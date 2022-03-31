import { Template } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class PersistTemplatesFromStaticModulesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    async execute(): Promise<Template[]> {
        const templates = this.templateRepository.getCustomTemplates();
        await this.templateRepository.saveTemplates(templates);
        return templates;
    }
}
