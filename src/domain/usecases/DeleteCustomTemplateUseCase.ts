import { Id } from "../entities/ReferenceObject";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class DeleteCustomTemplateUseCase {
    constructor(private templatesRepository: TemplateRepository) {}

    execute(templateId: Id): Promise<void> {
        return this.templatesRepository.deleteTemplate(templateId);
    }
}
