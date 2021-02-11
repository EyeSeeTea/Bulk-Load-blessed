import { UseCase } from "../../CompositionRoot";
import i18n from "../../locales";
import { checkVersion, getDataValues } from "../../webapp/logic/sheetImport";
import { ExcelReader } from "../helpers/ExcelReader";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class AnalyzeTemplateUseCase implements UseCase {
    constructor(
        private instanceRepository: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(file: File) {
        const templateId = await this.excelRepository.loadTemplate({ type: "file", file });
        const template = this.templateRepository.getTemplate(templateId);

        const dataFormId = await this.excelRepository.readCell(templateId, template.dataFormId, {
            formula: true,
        });

        if (!dataFormId || typeof dataFormId !== "string") {
            throw new Error(i18n.t("Cannot read data form id"));
        }

        const [dataForm] = await this.instanceRepository.getDataForms({
            ids: [cleanFormula(dataFormId)],
        });

        if (!dataForm) throw new Error(i18n.t("Program or DataSet not found in instance"));

        const orgUnits = await this.instanceRepository.getDataFormOrgUnits(dataForm.type, dataForm.id);

        if (template.type === "custom" || dataForm.type === "trackerPrograms") {
            const reader = new ExcelReader(this.excelRepository, this.instanceRepository);
            const excelDataValues = await reader.readTemplate(template);
            if (!excelDataValues) return { custom: true, dataForm, dataValues: [], orgUnits };

            const customDataValues = await reader.templateCustomization(template, excelDataValues);
            const dataEntries = customDataValues?.dataEntries ?? excelDataValues.dataEntries;

            const dataValues = dataEntries.map(({ id, dataValues, period }) => ({
                count: dataValues.length,
                id,
                period,
            }));

            return { custom: true, dataForm, dataValues, orgUnits };
        } else {
            const { rowOffset = 0, colOffset = 0 } = template;

            await checkVersion(file, dataForm);
            const dataValues = await getDataValues(file, dataForm, rowOffset, colOffset);

            return { custom: false, dataForm, dataValues, orgUnits, rowOffset, colOffset };
        }
    }
}

const cleanFormula = (string: string) => (string.startsWith("_") ? string.substr(1) : string);
