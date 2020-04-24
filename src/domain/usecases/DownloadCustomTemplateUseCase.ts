import { saveAs } from "file-saver";
import { Id } from "../entities/ReferenceObject";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class DownloadCustomTemplateUseCase {
    constructor(
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(templateId: Id, themeId?: Id): Promise<void> {
        try {
            const template = await this.templateRepository.getTemplate(templateId);

            if (themeId) {
                const theme = await this.templateRepository.getTheme(themeId);
                await this.excelRepository.applyTheme(template, theme);
            }

            const data = await this.excelRepository.toBlob(template);
            saveAs(data, `${template.name}.xlsx`);
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
