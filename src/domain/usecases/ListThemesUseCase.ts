import { Theme } from "../entities/Theme";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ListThemesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(): Promise<Theme[]> {
        const themes = await this.templateRepository.listThemes();
        return themes.map(data => new Theme(data));
    }
}
