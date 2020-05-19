import { Id } from "../entities/ReferenceObject";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class DeleteThemeUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(id: Id): Promise<void> {
        await this.templateRepository.deleteTheme(id);
    }
}
