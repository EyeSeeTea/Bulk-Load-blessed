import { UseCase } from "../../CompositionRoot";
import { ExcelReader } from "../helpers/ExcelReader";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ImportTemplateUseCase implements UseCase {
    constructor(
        private instanceRepository: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(file: File, _useBuilderOrgUnits: boolean): Promise<void> {
        const templateId = await this.excelRepository.loadTemplate({ type: "file", file });
        const template = this.templateRepository.getTemplate(templateId);

        const dataFormId = await this.excelRepository.readCell(templateId, template.dataFormId);
        if (!dataFormId || typeof dataFormId !== "string") throw new Error("Invalid data form id");

        const [dataForm] = await this.instanceRepository.getDataForms({ ids: [dataFormId] });
        if (!dataForm) throw new Error("Program or DataSet not found in instance");

        const reader = new ExcelReader(this.excelRepository);
        const dataValues = await reader.readTemplate(template);

        console.log({ dataValues, template, dataForm });

        // Get metadata from dataForm
        // Check organisation units that user has at least one orgUnit -> Error
        // Check programs latitude/longitude to see if it fits organisation unit boundaries -> noop
        // Read sheet
        // Overwrite organisation units if UI said so
        // Detect invalid organisation units -> Error
        // Detect existing values for duplicates -> Error
        // Finally import data
    }
}
