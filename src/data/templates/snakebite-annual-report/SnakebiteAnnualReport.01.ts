import _ from "lodash";
import { array, Codec, GetType, optional, record, string } from "purify-ts";
import { DataForm } from "../../../domain/entities/DataForm";
import { CustomTemplate, DataSource, StyleSource } from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";
import { cache } from "../../../utils/cache";
import { integer, optionalSafe } from "../../../utils/codec";
import { promiseMap } from "../../../webapp/utils/promises";

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
        const { national, subnational } = await this.getDataForms(instanceRepository);
        const metadata = await this.getCustomMetadata(instanceRepository);

        // Add metadata sheet
        await excelRepository.getOrCreateSheet(this.id, "Metadata");
        const labels = ["Type", "Identifier", "Name", "Info"];
        await promiseMap(labels, (label, index) =>
            excelRepository.writeCell(
                this.id,
                {
                    type: "cell",
                    sheet: "Metadata",
                    ref: `${excelRepository.columnNumberToName(index + 1)}1`,
                },
                label
            )
        );

        const items = _([national?.dataElements, subnational?.dataElements])
            .compact()
            .flatten()
            .flatMap(({ id, name, categoryOptionCombos = [] }) => [
                { id, name, type: "dataElement" },
                ...categoryOptionCombos.map(({ id, name }) => ({
                    id,
                    name,
                    type: "categoryOptionCombo",
                })),
            ])
            .value();

        await promiseMap(items, async ({ id, name, type }, index) => {
            const label =
                metadata?.dataElements[id]?.totalName ?? metadata?.optionCombos[id]?.name ?? name;
            const info = metadata?.optionCombos[id]?.info ?? "";

            const buildRef = (column: string, row: number) => ({
                type: "cell" as const,
                sheet: "Metadata",
                ref: `${column}${row}`,
            });

            await excelRepository.writeCell(this.id, buildRef("A", index + 2), type);
            await excelRepository.writeCell(this.id, buildRef("B", index + 2), id);
            await excelRepository.writeCell(this.id, buildRef("C", index + 2), label);
            await excelRepository.writeCell(this.id, buildRef("D", index + 2), info);
            await excelRepository.defineName(this.id, `_${id}`, buildRef("C", index + 2));
        });
    }

    @cache()
    private async getDataForms(
        instanceRepository: InstanceRepository
    ): Promise<{ national?: DataForm; subnational?: DataForm }> {
        const dataForms = await instanceRepository.getDataForms({
            ids: ["XBgvNrxpcDC", "SAV16xEdCZW"],
            type: ["dataSets"],
        });

        return {
            national: dataForms.find(({ id }) => id === "XBgvNrxpcDC"),
            subnational: dataForms.find(({ id }) => id === "SAV16xEdCZW"),
        };
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
    dataElements: optionalSafe(
        record(
            string,
            Codec.interface({
                totalName: optional(string),
                info: optional(string),
            })
        ),
        {}
    ),
    optionCombos: optionalSafe(
        record(
            string,
            Codec.interface({
                name: optional(string),
                info: optional(string),
                order: optional(integer),
            })
        ),
        {}
    ),
    adminUserGroups: optionalSafe(array(string), []),
    subnationalDataSet: optional(string),
});

type CustomMetadata = GetType<typeof CustomMetadataModel>;
