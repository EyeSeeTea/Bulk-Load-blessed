import { saveAs } from "file-saver";
import fs from "fs";
import { Moment } from "moment";
import { UseCase } from "../../CompositionRoot";
import * as dhisConnector from "../../webapp/logic/dhisConnector";
import { getTemplateId, SheetBuilder } from "../../webapp/logic/sheetBuilder";
import { DataFormType } from "../entities/DataForm";
import { Id } from "../entities/ReferenceObject";
import { ExcelBuilder } from "../helpers/ExcelBuilder";
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
    writeFile?: string;
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
            writeFile,
        }: DownloadTemplateProps
    ): Promise<void> {
        try {
            const { id: templateId } = getTemplateId(type, id);
            const template = this.templateRepository.getTemplate(templateId);
            const theme = themeId ? await this.templateRepository.getTheme(themeId) : undefined;

            const element = await dhisConnector.getElement(api, type, id);
            const name = element.displayName ?? element.name;

            if (template.type === "custom") {
                await this.excelRepository.loadTemplate({ type: "url", url: template.url });
            } else {
                const result = await dhisConnector.getElementMetadata({
                    api,
                    element,
                    orgUnitIds: orgUnits,
                });

                // FIXME: Legacy code, sheet generator
                const sheetBuilder = new SheetBuilder({
                    ...result,
                    startDate,
                    endDate,
                    language,
                    theme,
                    template,
                });
                const workbook = await sheetBuilder.generate();

                const file = await workbook.writeToBuffer();

                await this.excelRepository.loadTemplate({ type: "file", file });
            }

            const builder = new ExcelBuilder(this.excelRepository, this.instance);

            if (theme) await builder.applyTheme(template, theme);

            if (populate && populateStartDate && populateEndDate) {
                const dataPackage = await this.instance.getDataPackage({
                    type,
                    id,
                    orgUnits,
                    startDate: populateStartDate,
                    endDate: populateEndDate,
                    translateCodes: template.type !== "custom",
                });

                if (template.type === "custom" && template.fixedOrgUnit) {
                    await this.excelRepository.writeCell(
                        template.id,
                        template.fixedOrgUnit,
                        dataPackage.dataEntries[0]?.orgUnit
                    );
                }

                if (template.type === "custom" && template.fixedPeriod) {
                    await this.excelRepository.writeCell(
                        template.id,
                        template.fixedPeriod,
                        dataPackage.dataEntries[0]?.period
                    );
                }

                await builder.populateTemplate(template, dataPackage);
            }

            const filename = `${name}.xlsx`;

            if (writeFile) {
                const buffer = await this.excelRepository.toBuffer(templateId);
                fs.writeFileSync(writeFile, buffer);
            } else {
                const data = await this.excelRepository.toBlob(templateId);
                saveAs(data, filename);
            }
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
