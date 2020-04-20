import { Theme } from "../entities/Theme";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class SaveThemeUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(theme: Theme): Promise<void> {
        // TODO: Add validation
        await this.templateRepository.saveTheme(theme);
    }
}
