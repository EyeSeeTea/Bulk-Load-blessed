import { Id } from "../entities/ReferenceObject";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class GetTemplateInfoUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public execute(id: Id): { rowOffset: number; colOffset: number } {
        const { rowOffset, colOffset } = this.templateRepository.getTemplate(id);
        return { rowOffset, colOffset };
    }
}
