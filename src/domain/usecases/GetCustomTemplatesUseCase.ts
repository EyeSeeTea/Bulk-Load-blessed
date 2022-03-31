import { Template } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class GetCustomTemplatesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    async execute(): Promise<Template[]> {
        const templates = await this.templateRepository.getTemplates();
        return templates.filter(template => template.type === "custom");
    }
}
