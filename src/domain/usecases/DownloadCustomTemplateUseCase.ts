import { saveAs } from "file-saver";
import { UseCase } from "../../CompositionRoot";
import { Id } from "../entities/ReferenceObject";
import { ExcelBuilder } from "../helpers/ExcelBuilder";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class DownloadCustomTemplateUseCase implements UseCase {
    constructor(
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository
    ) {}

    public async execute(templateId: Id, themeId?: Id): Promise<void> {
        try {
            const template = this.templateRepository.getTemplate(templateId);

            if (themeId) {
                const theme = await this.templateRepository.getTheme(themeId);
                await new ExcelBuilder(this.excelRepository, this.instanceRepository).applyTheme(
                    template,
                    theme
                );
            }

            const data = await this.excelRepository.toBlob(template.id);
            saveAs(data, `${template.name}.xlsx`);
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
