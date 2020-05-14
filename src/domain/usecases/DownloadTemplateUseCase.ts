import { saveAs } from "file-saver";
import { Moment } from "moment";
import * as dhisConnector from "../../webapp/logic/dhisConnector";
import { SheetBuilder } from "../../webapp/logic/sheetBuilder";
import { DataFormType } from "../entities/DataForm";
import { Id } from "../entities/ReferenceObject";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

interface DownloadTemplateProps {
    d2: unknown;
    type: DataFormType;
    id: string;
    name: string;
    orgUnits: string[];
    populate: boolean;
    startDate?: Moment;
    endDate?: Moment;
    language?: string;
    theme?: Id;
}

export class DownloadTemplateUseCase {
    constructor(
        private instance: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute({
        d2,
        type,
        id,
        theme: themeId,
        orgUnits,
        populate,
        startDate,
        endDate,
        language,
    }: DownloadTemplateProps): Promise<void> {
        try {
            // FIXME: Legacy code, connector with d2
            const element = await dhisConnector.getElement(d2, type, id);
            const result = await dhisConnector.getElementMetadata({
                d2,
                element: { ...element, endpoint: type, type },
                organisationUnits: orgUnits,
            });

            const theme = themeId ? await this.templateRepository.getTheme(themeId) : undefined;

            // FIXME: Legacy code, sheet generator
            const builderOutput = new SheetBuilder({
                ...result,
                startDate,
                endDate,
                language,
                palette: theme?.palette,
            });

            const name = element.displayName ?? element.name;
            const file = await builderOutput.toBlob();

            const templateId = type === "dataSet" ? "DATASET_GENERATED_v1" : "PROGRAM_GENERATED_v2";
            const template = this.templateRepository.getTemplate(templateId);
            await this.excelRepository.loadTemplate(template, { type: "file", file });

            if (theme) await this.excelRepository.applyTheme(template, theme);

            if (populate) {
                const dataPackage = await this.instance.getDataPackage({
                    type,
                    id,
                    orgUnits,
                    startDate,
                    endDate,
                });
                await this.excelRepository.populateTemplate(template, dataPackage);
            }

            const data = await this.excelRepository.toBlob(template);
            saveAs(data, `${name}.xlsx`);
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
