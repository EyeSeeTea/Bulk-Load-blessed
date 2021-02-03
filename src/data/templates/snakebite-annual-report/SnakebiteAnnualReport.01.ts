import { array, Codec, GetType, oneOf, optional, record, string } from "purify-ts";
import { Integer, IntegerFromString } from "purify-ts-extra-codec";
import { CustomTemplate, DataSource, StyleSource } from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";

export class SnakebiteAnnualReport implements CustomTemplate {
    public readonly type = "custom";
    public readonly id = "SNAKEBITE_ANNUAL_REPORT_v1";
    public readonly name = "Snakebite Annual Report";
    public readonly url = "templates/Snakebite_Annual_Report.xlsx";
    public readonly dataFormId = { type: "value" as const, id: "XBgvNrxpcDC" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };
    public readonly fixedOrgUnit = {
        type: "cell" as const,
        sheet: "National",
        ref: "B4", // Used for populate
    };
    public readonly fixedPeriod = {
        type: "cell" as const,
        sheet: "National",
        ref: "B5", // Used for populate
    };

    public readonly dataSources: DataSource[] = [];

    public readonly styleSources: StyleSource[] = [];

    public async downloadCustomization(
        excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository
    ): Promise<void> {
        const metadata = await this.getCustomMetadata(instanceRepository);
        console.log({ metadata, excelRepository, instanceRepository });

        // Add metadata sheet
        await excelRepository.getOrCreateSheet(this.id, "Metadata");
    }

    private async getCustomMetadata(
        instanceRepository: InstanceRepository
    ): Promise<CustomMetadata | undefined> {
        const dataStore = instanceRepository.getDataStore("snake-bite");

        try {
            const response = await dataStore.get("customMetadata").getData();
            return CustomMetadataModel.unsafeDecode(response);
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }
}

const CustomMetadataModel = Codec.interface({
    dataElements: optional(
        record(
            string,
            Codec.interface({
                totalName: optional(string),
                info: optional(string),
            })
        )
    ),
    optionCombos: optional(
        record(
            string,
            Codec.interface({
                name: optional(string),
                info: optional(string),
                order: optional(oneOf([Integer, IntegerFromString])),
            })
        )
    ),
    adminUserGroups: optional(array(string)),
    subnationalDataSet: optional(string),
});

type CustomMetadata = GetType<typeof CustomMetadataModel>;
