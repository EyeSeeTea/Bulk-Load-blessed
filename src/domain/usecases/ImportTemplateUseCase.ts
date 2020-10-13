import _ from "lodash";
import { UseCase } from "../../CompositionRoot";
import { DataForm } from "../entities/DataForm";
import { DataPackage } from "../entities/DataPackage";
import { Either } from "../entities/Either";
import { Template } from "../entities/Template";
import { ExcelReader } from "../helpers/ExcelReader";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export type ImportTemplateError =
    | {
          type: "INVALID_DATA_FORM_ID" | "DATA_FORM_NOT_FOUND" | "INVALID_OVERRIDE_ORG_UNIT";
      }
    | { type: "INVALID_ORG_UNITS"; dataValues: DataPackage[]; invalidDataValues: DataPackage[] };

export interface ImportTemplateUseCaseParams {
    file: File;
    useBuilderOrgUnits?: boolean;
    selectedOrgUnits?: string[];
}

export class ImportTemplateUseCase implements UseCase {
    constructor(
        private instanceRepository: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute({
        file,
        useBuilderOrgUnits = false,
        selectedOrgUnits = [],
    }: ImportTemplateUseCaseParams): Promise<Either<ImportTemplateError, void>> {
        if (useBuilderOrgUnits && selectedOrgUnits.length !== 1) {
            return Either.error({ type: "INVALID_OVERRIDE_ORG_UNIT" });
        }

        const templateId = await this.excelRepository.loadTemplate({ type: "file", file });
        const template = this.templateRepository.getTemplate(templateId);

        const dataFormId = await this.excelRepository.readCell(templateId, template.dataFormId);
        if (!dataFormId || typeof dataFormId !== "string") {
            return Either.error({ type: "INVALID_DATA_FORM_ID" });
        }

        const [dataForm] = await this.instanceRepository.getDataForms({ ids: [dataFormId] });
        if (!dataForm) {
            return Either.error({ type: "DATA_FORM_NOT_FOUND" });
        }

        const { dataValues, invalidDataValues } = await this.readDataValues(
            template,
            dataForm,
            useBuilderOrgUnits,
            selectedOrgUnits
        );

        if (invalidDataValues.length > 0) {
            return Either.error({ type: "INVALID_ORG_UNITS", dataValues, invalidDataValues });
        }

        console.log({ dataValues, template, dataForm });

        return Either.success(undefined);

        // Get metadata from dataForm
        // Check programs latitude/longitude to see if it fits organisation unit boundaries -> noop
        // Read sheet
        // Overwrite organisation units if UI said so
        // Detect invalid organisation units -> Error
        // Detect existing values for duplicates -> Error
        // Finally import data
    }

    private async readDataValues(
        template: Template,
        dataForm: DataForm,
        useBuilderOrgUnits: boolean,
        selectedOrgUnits: string[]
    ) {
        const reader = new ExcelReader(this.excelRepository);
        const rawDataValues = await reader.readTemplate(template);
        const dataFormOrgUnits = await this.instanceRepository.getDataFormOrgUnits(
            dataForm.type,
            dataForm.id
        );

        // Override org unit if needed
        const dataValues = rawDataValues.map(({ orgUnit, ...rest }) => ({
            ...rest,
            orgUnit: useBuilderOrgUnits ? selectedOrgUnits[0] : orgUnit,
        }));

        // Remove data values assigned to invalid org unit
        const invalidDataValues = _.remove(
            dataValues,
            ({ orgUnit }) => !dataFormOrgUnits.find(({ id }) => id === orgUnit)
        );

        return { dataValues, invalidDataValues };
    }
}
