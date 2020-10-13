import { UseCase } from "../../CompositionRoot";
import { NHWAModule101 } from "../../data/templates";
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
        console.log(
            dataForm,
            file,
            useBuilderOrgUnits,
            this.instance,
            this.templateRepository,
            this.excelRepository
        );

        const template = new NHWAModule101();
        await this.excelRepository.loadTemplate(template, { type: "file", file });
        const foo = await new ExcelReader(this.excelRepository).readTemplate(template);
        console.log({ foo });

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
