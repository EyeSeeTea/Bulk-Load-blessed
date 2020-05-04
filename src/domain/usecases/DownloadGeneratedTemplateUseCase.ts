import { saveAs } from "file-saver";
import { Id } from "../entities/ReferenceObject";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class DownloadGeneratedTemplateUseCase {
    constructor(
        private instance: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(name: string, file: File, themeId?: Id): Promise<void> {
        try {
            const template = this.templateRepository.getTemplate("PROGRAM_GENERATED_v0");
            await this.excelRepository.loadTemplate(template, { type: "file", file });

            if (themeId) {
                const theme = await this.templateRepository.getTheme(themeId);
                await this.excelRepository.applyTheme(template, theme);
            }

            // TODO: Read values from dropdowns
            const dataPackage = await this.instance.getDataPackage({
                type: "program",
                id: "yx6VLBFBlrK",
                orgUnits: ["H8RixfF8ugH"],
            });

            await this.excelRepository.populateTemplate(template, dataPackage);

            const data = await this.excelRepository.toBlob(template);
            saveAs(data, `${name}.xlsx`);
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
