import _ from "lodash";
import moment from "moment";
import { UseCase } from "../../CompositionRoot";
import { DuplicateExclusion, DuplicateToleranceUnit } from "../entities/AppSettings";
import { DataForm } from "../entities/DataForm";
import { DataPackage, DataValue } from "../entities/DataPackage";
import { Either } from "../entities/Either";
import { ImportSummary } from "../entities/ImportSummary";
import { Template } from "../entities/Template";
import { ExcelReader } from "../helpers/ExcelReader";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export type ImportTemplateError =
    | {
          type: "INVALID_DATA_FORM_ID" | "DATA_FORM_NOT_FOUND" | "INVALID_OVERRIDE_ORG_UNIT";
      }
    | { type: "INVALID_ORG_UNITS"; dataValues: DataPackage[]; invalidDataValues: DataPackage[] }
    | { type: "DUPLICATE_VALUES"; dataValues: DataPackage[]; existingDataValues: DataPackage[] };

export interface ImportTemplateUseCaseParams {
    file: File;
    useBuilderOrgUnits?: boolean;
    selectedOrgUnits?: string[];
    duplicateExclusion: DuplicateExclusion;
    duplicateTolerance: number;
    duplicateToleranceUnit: DuplicateToleranceUnit;
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
        duplicateExclusion,
        duplicateTolerance,
        duplicateToleranceUnit,
    }: ImportTemplateUseCaseParams): Promise<Either<ImportTemplateError, ImportSummary>> {
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

        const { dataValues, invalidDataValues, existingDataValues } = await this.readDataValues(
            template,
            dataForm,
            useBuilderOrgUnits,
            selectedOrgUnits,
            duplicateExclusion,
            duplicateTolerance,
            duplicateToleranceUnit
        );

        if (invalidDataValues.length > 0) {
            return Either.error({ type: "INVALID_ORG_UNITS", dataValues, invalidDataValues });
        }

        if (existingDataValues.length > 0) {
            return Either.error({ type: "DUPLICATE_VALUES", dataValues, existingDataValues });
        }

        console.log({
            dataValues,
            invalidDataValues,
            existingDataValues,
            template,
            dataForm,
        });

        const result = await this.instanceRepository.importDataPackage(dataForm.type, dataValues);

        return Either.success(result);
    }

    private async readDataValues(
        template: Template,
        dataForm: DataForm,
        useBuilderOrgUnits: boolean,
        selectedOrgUnits: string[],
        duplicateExclusion: DuplicateExclusion,
        duplicateTolerance: number,
        duplicateToleranceUnit: DuplicateToleranceUnit
    ) {
        const reader = new ExcelReader(this.excelRepository);
        const excelDataValues = await reader.readTemplate(template);
        const instanceDataValues = await this.getInstanceDataValues(dataForm, excelDataValues);
        const dataFormOrgUnits = await this.instanceRepository.getDataFormOrgUnits(
            dataForm.type,
            dataForm.id
        );

        // Override org unit if needed
        const dataValues = excelDataValues.map(({ orgUnit, ...rest }) => ({
            ...rest,
            orgUnit: useBuilderOrgUnits ? selectedOrgUnits[0] : orgUnit,
        }));

        // Remove data values assigned to invalid org unit
        const invalidDataValues = _.remove(
            dataValues,
            ({ orgUnit }) => !dataFormOrgUnits.find(({ id }) => id === orgUnit)
        );

        const existingDataValues = _.remove(dataValues, base => {
            return instanceDataValues.find(dataPackage =>
                compareDataPackages(
                    dataForm,
                    base,
                    dataPackage,
                    duplicateExclusion,
                    duplicateTolerance,
                    duplicateToleranceUnit
                )
            );
        });

        return { dataValues, invalidDataValues, existingDataValues };
    }

    private async getInstanceDataValues(dataForm: DataForm, excelDataValues: DataPackage[]) {
        const periods = _.uniq(excelDataValues?.map(({ period }) => period.toString()));
        const orgUnits = _.uniq(excelDataValues?.map(({ orgUnit }) => orgUnit));

        return this.instanceRepository.getDataPackage({
            id: dataForm.id,
            type: dataForm.type,
            periods,
            orgUnits,
            translateCodes: false,
        });
    }
}

const compareDataPackages = (
    dataForm: DataForm,
    base: Partial<DataPackage>,
    compare: DataPackage,
    duplicateExclusion: DuplicateExclusion,
    duplicateTolerance: number,
    duplicateToleranceUnit: DuplicateToleranceUnit
): boolean => {
    const properties = _.compact([
        dataForm.type === "dataSets" ? "period" : undefined,
        "orgUnit",
        "attribute",
    ]);

    for (const property of properties) {
        const baseValue = _.get(base, property);
        const compareValue = _.get(compare, property);
        const areEqual = _.isEqual(baseValue, compareValue);
        if (baseValue && compareValue && !areEqual) return false;
    }

    if (dataForm.type === "programs") {
        if (
            moment
                .duration(moment(base.period).diff(moment(compare.period)))
                .abs()
                .as(duplicateToleranceUnit) > duplicateTolerance
        ) {
            return false;
        }

        // Ignore data packages with event id set
        if (base.id && compare.id) return false;

        const exclusions = duplicateExclusion[dataForm.id] ?? [];
        const filter = (values: DataValue[]) => {
            return values.filter(({ dataElement }) => !exclusions.includes(dataElement));
        };

        if (
            base.dataValues &&
            !_.isEqualWith(
                filter(base.dataValues),
                filter(compare.dataValues),
                (base: DataValue[], compare: DataValue[]) => {
                    const values = ({ dataElement, value }: DataValue) => `${dataElement}-${value}`;
                    const intersection = _.intersectionBy(base, compare, values);
                    return base.length === compare.length && intersection.length === base.length;
                }
            )
        ) {
            return false;
        }
    }

    return true;
};
