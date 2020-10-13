import { UseCase } from "../../CompositionRoot";
import { DataForm } from "../entities/DataForm";
import { ExcelReader } from "../helpers/ExcelReader";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ImportTemplateUseCase implements UseCase {
    constructor(
        private instance: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(
        dataForm: DataForm | undefined,
        file: File,
        useBuilderOrgUnits: boolean
    ): Promise<void> {
        console.log(dataForm, file, useBuilderOrgUnits, this.instance);

        const templateId = await this.excelRepository.loadTemplate({ type: "file", file });
        const template = this.templateRepository.getTemplate(templateId);

        const foo = await new ExcelReader(this.excelRepository).readTemplate(template);
        console.log({ foo, template });

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
