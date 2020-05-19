import { Theme } from "../entities/Theme";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ListThemesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(): Promise<Theme[]> {
        return this.templateRepository.listThemes();
    }
}
