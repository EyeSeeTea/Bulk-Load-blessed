import { UseCase } from "../../CompositionRoot";
import { Either } from "../entities/Either";
import { ExcelReader } from "../helpers/ExcelReader";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export type ImportTemplateError = {
    type: "INVALID_DATA_FORM_ID" | "DATA_FORM_NOT_FOUND" | "PROVIDE_ORG_UNITS_TO_OVERRIDE";
};

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
        if (useBuilderOrgUnits && selectedOrgUnits.length === 0) {
            return Either.error({ type: "PROVIDE_ORG_UNITS_TO_OVERRIDE" });
        }

        const templateId = await this.excelRepository.loadTemplate({ type: "file", file });
        const template = this.templateRepository.getTemplate(templateId);

        const dataFormId = await this.excelRepository.readCell(templateId, template.dataFormId);
        if (!dataFormId || typeof dataFormId !== "string") {
            return Either.error({ type: "INVALID_DATA_FORM_ID" });
        }

        const [dataForm] = await this.instanceRepository.getDataForms({ ids: [dataFormId] });
        if (!dataForm) return Either.error({ type: "DATA_FORM_NOT_FOUND" });

        const reader = new ExcelReader(this.excelRepository);
        const dataValues = await reader.readTemplate(template);

        const dataFormOrgUnits = await this.instanceRepository.getDataFormOrgUnits(
            dataForm.type,
            dataForm.id
        );

        console.log({ dataValues, template, dataForm, dataFormOrgUnits });

        return Either.success(undefined);

        // Get metadata from dataForm
        // Check programs latitude/longitude to see if it fits organisation unit boundaries -> noop
        // Read sheet
        // Overwrite organisation units if UI said so
        // Detect invalid organisation units -> Error
        // Detect existing values for duplicates -> Error
        // Finally import data
    }
}
