import { saveAs } from "file-saver";
import { Moment } from "moment";
import { Id } from "../entities/ReferenceObject";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

interface DownloadTemplateProps {
    type: "dataSets" | "programs";
    id: string;
    name: string;
    orgUnits: string[];
    startDate?: Moment;
    endDate?: Moment;
    file: File;
    theme?: Id;
}

export class DownloadTemplateUseCase {
    constructor(
        private instance: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute({
        type,
        id,
        name,
        file,
        theme: themeId,
        orgUnits,
        startDate,
        endDate,
    }: DownloadTemplateProps): Promise<void> {
        try {
            const templateId =
                type === "dataSets" ? "DATASET_GENERATED_v0" : "PROGRAM_GENERATED_v0";
            const template = this.templateRepository.getTemplate(templateId);
            await this.excelRepository.loadTemplate(template, { type: "file", file });

            if (themeId) {
                const theme = await this.templateRepository.getTheme(themeId);
                await this.excelRepository.applyTheme(template, theme);
            }

            const dataPackage = await this.instance.getDataPackage({
                type,
                id,
                orgUnits,
                startDate,
                endDate,
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
