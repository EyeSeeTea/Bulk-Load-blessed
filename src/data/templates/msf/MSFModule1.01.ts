import {
    CustomTemplateWithUrl,
    DataSource,
    DownloadCustomizationOptions,
    StyleSource,
} from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";
import { ModulesRepositories } from "../../../domain/repositories/ModulesRepositories";
import { MSFModuleMetadataRepository } from "../../../domain/repositories/templates/MSFModuleMetadataRepository";

export class MSFModule101 implements CustomTemplateWithUrl {
    public readonly type = "custom";

    public readonly id = "MSFmodule_v1";
    public readonly name = "MSFModule";
    public readonly description = "";
    public readonly url = "templates/MSFModule.xlsx";

    public readonly generateMetadata = true;

    public readonly dataFormId = { type: "cell" as const, sheet: "Data Entry", ref: "A4" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };

    public readonly dataSources: DataSource[] = [
        {
            type: "row",
            orgUnit: { sheet: "Data Entry", type: "column", ref: "A" },
            period: { sheet: "Data Entry", type: "column", ref: "B" },
            attribute: { sheet: "Data Entry", type: "column", ref: "C" },
            range: { sheet: "Data Entry", rowStart: 6, columnStart: "D" },
            dataElement: { sheet: "Data Entry", type: "row", ref: 4 },
            categoryOption: { sheet: "Data Entry", type: "row", ref: 5 },
        },
    ];

    public readonly styleSources: StyleSource[] = [];

    public async downloadCustomization(
        excelRepository: ExcelRepository,
        _instanceRepository: InstanceRepository,
        modulesRepositories: ModulesRepositories,
        options: DownloadCustomizationOptions
    ): Promise<void> {
        await new DownloadCustomization(this.id, excelRepository, modulesRepositories.msf, options).execute();
    }
}

class DownloadCustomization {
    constructor(
        private templateId: string,
        private excelRepository: ExcelRepository,
        private moduleRepository: MSFModuleMetadataRepository,
        private options: DownloadCustomizationOptions
    ) {}

    sheets = {
        mapping: "mapping",
        entryForm: "Entry form",
    };

    async execute() {
        const metadata = await this.moduleRepository.get({ dataSetId: this.options.id });
        const mappingSheet = await this.getSheet(this.sheets.mapping);
        const entrySheet = await this.getSheet(this.sheets.entryForm);

        console.debug("Fill entryForm and mapping sheets from metadata", {
            metadata,
            mappingSheet,
            entrySheet,
        });

        await this.setMappingAsDone();
    }

    private async setMappingAsDone() {
        await this.excelRepository.writeCell(
            this.templateId,
            { type: "cell", sheet: this.sheets.mapping, ref: "C1" },
            1
        );
    }

    private async getSheet(name: string) {
        return this.excelRepository.getOrCreateSheet(this.templateId, name);
    }
}
