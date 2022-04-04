import _ from "lodash";
import { CustomTemplate } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class GetCustomTemplatesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    async execute(): Promise<CustomTemplate[]> {
        const templates = await this.templateRepository.getTemplates();

        return _(templates)
            .map(template => (template.type === "custom" ? template : null))
            .compact()
            .value();
    }
}
