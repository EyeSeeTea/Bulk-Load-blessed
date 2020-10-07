import { UseCase } from "../../CompositionRoot";
import { DataForm } from "../entities/DataForm";

export class ImportTemplateUseCase implements UseCase {
    constructor() {}

    public async execute(
        dataForm: DataForm,
        file: File,
        useBuilderOrgUnits: boolean
    ): Promise<void> {
        console.log(dataForm, file, useBuilderOrgUnits);

        // Get metadata from dataForm
        // Check organisation units that user has at least one orgUnit -> Error
        // Check programs latitude/longitude to see if it fits organisation unit boundaries -> noop
        // Read sheet
        // Overwrite organisation units if UI said so
        // Detect invalid organisation units -> Error
        // Detect existing values for duplicates -> Error
        // Import data
    }
}
