import { CustomTemplate, Template } from "../entities/Template";
import { getUserTimestamp, User } from "../entities/User";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class SaveCustomTemplateUseCase {
    constructor(private templatesRepository: TemplateRepository) {}

    async execute(options: { template: CustomTemplate; currentUser: User }): Promise<void> {
        const { template, currentUser } = options;
        const existingTemplate = await this.getExistingCustomTemplate(template);

        const templateToSave: CustomTemplate = {
            ...existingTemplate,
            ...template,
            lastUpdated: getUserTimestamp(currentUser),
            created: existingTemplate?.created || getUserTimestamp(currentUser),
        };

        return this.templatesRepository.saveTemplate(templateToSave);
    }

    private async getExistingCustomTemplate(template: CustomTemplate): Promise<Partial<CustomTemplate>> {
        let existingTemplate: Partial<Template>;

        try {
            existingTemplate = await this.templatesRepository.getTemplate(template.id);
        } catch {
            return {};
        }

        if (existingTemplate.type !== "custom") throw new Error("Not a custom template");
        return existingTemplate;
    }
}
