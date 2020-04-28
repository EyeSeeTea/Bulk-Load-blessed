import { Theme } from "../entities/Theme";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ListTemplatesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(): Promise<{ id: string; name: string; themes: Theme[] }[]> {
        const templates = this.templateRepository.listTemplates();
        const themes = await this.templateRepository.listThemes();
        return templates.map(({ id, name }) => ({
            id,
            name,
            themes: themes.filter(({ templates }) => templates.includes(id)),
        }));
    }
}
