import { saveAs } from "file-saver";
import { Moment } from "moment";
import { UseCase } from "../../CompositionRoot";
import * as dhisConnector from "../../webapp/logic/dhisConnector";
import { dataSetId, programId, SheetBuilder } from "../../webapp/logic/sheetBuilder";
import { DataFormType } from "../entities/DataForm";
import { Id } from "../entities/ReferenceObject";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export interface DownloadTemplateProps {
    type: DataFormType;
    id: Id;
    language: string;
    orgUnits?: string[];
    theme?: Id;
    startDate?: Moment;
    endDate?: Moment;
    populate: boolean;
    populateStartDate?: Moment;
    populateEndDate?: Moment;
}

export class DownloadTemplateUseCase implements UseCase {
    constructor(
        private instance: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(
        api: unknown,
        {
            type,
            id,
            theme: themeId,
            orgUnits = [],
            startDate,
            endDate,
            language,
            populate,
            populateStartDate,
            populateEndDate,
        }: DownloadTemplateProps
    ): Promise<void> {
        try {
            const templateId = type === "dataSets" ? dataSetId : programId;
            const template = this.templateRepository.getTemplate(templateId);
            const theme = themeId ? await this.templateRepository.getTheme(themeId) : undefined;

            const element = await dhisConnector.getElement(api, type, id);
            const result = await dhisConnector.getElementMetadata({
                api,
                element,
                orgUnitIds: orgUnits,
            });

            // FIXME: Legacy code, sheet generator
            const builderOutput = new SheetBuilder({
                ...result,
                startDate,
                endDate,
                language,
                theme,
                template,
            });

            const name = element.displayName ?? element.name;
            const file = await builderOutput.toBlob();

            await this.excelRepository.loadTemplate(template, { type: "file", file });

            if (theme) await this.excelRepository.applyTheme(template, theme);

            if (populate && populateStartDate && populateEndDate) {
                const dataPackage = await this.instance.getDataPackage({
                    type,
                    id,
                    orgUnits,
                    startDate: populateStartDate,
                    endDate: populateEndDate,
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
