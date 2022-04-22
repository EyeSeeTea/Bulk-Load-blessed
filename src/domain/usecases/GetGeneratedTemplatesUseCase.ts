import _ from "lodash";
import { GeneratedTemplate } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class GetGeneratedTemplatesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    async execute(): Promise<GeneratedTemplate[]> {
        const templates = await this.templateRepository.getTemplates();

        return _(templates)
            .map(template => (template.type === "generated" ? template : null))
            .compact()
            .value();
    }
}
