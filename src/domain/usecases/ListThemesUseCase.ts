import { UseCase } from "../../CompositionRoot";
import { Theme } from "../entities/Theme";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ListThemesUseCase implements UseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(): Promise<Theme[]> {
        return this.templateRepository.listThemes();
    }
}
