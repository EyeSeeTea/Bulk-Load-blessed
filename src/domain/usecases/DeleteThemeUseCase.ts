import { UseCase } from "../../CompositionRoot";
import { Id } from "../entities/ReferenceObject";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class DeleteThemeUseCase implements UseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(id: Id): Promise<void> {
        await this.templateRepository.deleteTheme(id);
    }
}
