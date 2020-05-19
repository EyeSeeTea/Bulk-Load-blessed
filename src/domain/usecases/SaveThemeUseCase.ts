import { Theme } from "../entities/Theme";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { getValidationMessages } from "../../utils/validation";

export class SaveThemeUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public async execute(theme: Theme): Promise<string[]> {
        const errors = await getValidationMessages(theme.validate());
        if (errors.length === 0) await this.templateRepository.saveTheme(theme);

        return errors;
    }
}
