import _ from "lodash";
import { array, boolean, Codec, GetType, optional, record, string } from "purify-ts";
import { DataElement, DataForm } from "../../../domain/entities/DataForm";
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
    public readonly fixedOrgUnit = { type: "cell" as const, sheet: "National", ref: "B3" };
    public readonly fixedPeriod = { type: "cell" as const, sheet: "National", ref: "E3" };

    public readonly dataSources: DataSource[] = [
        (sheet: string) => {
            switch (sheet) {
                case "National":
                    return _.range(20).map(offset => ({
                        type: "row",
                        orgUnit: { sheet: "National", type: "cell", ref: "B3" },
                        period: { sheet: "National", type: "cell", ref: "E3" },
                        range: {
                            sheet: "National",
                            rowStart: 8 + offset * 5,
                            rowEnd: 8 + offset * 5,
                            columnStart: "A",
                        },
                        dataElement: { sheet: "National", type: "row", ref: 6 + offset * 5 },
                        categoryOption: { sheet: "National", type: "row", ref: 7 + offset * 5 },
                    }));
                default:
                    return [];
            }
        },
    ];

    public readonly styleSources: StyleSource[] = [];

    public async downloadCustomization(
        excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository
    ): Promise<void> {
        const { national, subnational } = await this.getDataForms(instanceRepository);
        const metadata = await this.getCustomMetadata(instanceRepository);
        const antivenomEntries = await this.getAntivenomEntries(instanceRepository);

        const write = (sheet: string, column: string, row: number, value: string) =>
            excelRepository.writeCell(
                this.id,
                {
                    type: "cell" as const,
                    sheet: sheet,
                    ref: `${column}${row}`,
                },
                value
            );

        const defineName = (sheet: string, column: string, row: number, name: string) =>
            excelRepository.defineName(this.id, `_${name}`, {
                type: "cell" as const,
                sheet: sheet,
                ref: `${column}${row}`,
            });

        // Add metadata sheet
        await excelRepository.getOrCreateSheet(this.id, "Metadata");

        // Add metadata sheet columns
        await promiseMap(["Type", "Identifier", "Name", "Info"], (label, index) =>
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

        // Add metadata sheet rows
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

        const metadataStart = 2;
        await promiseMap(items, async ({ id, name, type }, index) => {
            const label =
                metadata?.dataElements[id]?.totalName ?? metadata?.optionCombos[id]?.name ?? name;
            const info = metadata?.optionCombos[id]?.info ?? "";

            await write("Metadata", "A", index + metadataStart, type);
            await write("Metadata", "B", index + metadataStart, id);
            await write("Metadata", "C", index + metadataStart, label);
            await write("Metadata", "D", index + metadataStart, info);
            await defineName("Metadata", "C", index + metadataStart, id);
        });

        // Add National sheet
        const dataElements: Array<
            DataElement & { section?: { id: string; name: string } }
        > = national?.sections
            ? _.flatMap(national.sections, ({ id, name, dataElements }) =>
                  dataElements.map(dataElement => ({ ...dataElement, section: { id, name } }))
              )
            : national?.dataElements ?? [];

        const antivenomDataElementIds = _.flatMap(antivenomEntries?.groups, group =>
            group.dataElements.map(de => de.id)
        );

        const nationalStart = 5;
        await excelRepository.getOrCreateSheet(this.id, "National");
        await promiseMap(dataElements, async (dataElement, index) => {
            if (antivenomDataElementIds.includes(dataElement.id)) {
                return;
            }

            const offset = index * 5;
            await write("National", "A", offset + nationalStart, dataElement.section?.name ?? "");
            await write("National", "A", offset + nationalStart + 1, `=_${dataElement.id}`);
            await promiseMap(dataElement.categoryOptionCombos ?? [], async (category, catIndex) => {
                await write(
                    "National",
                    excelRepository.columnNumberToName(catIndex + 1),
                    offset + nationalStart + 2,
                    `=_${category.id}`
                );
            });
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
        try {
            const dataStore = instanceRepository.getDataStore("snake-bite");
            const response = await dataStore.get("customMetadata").getData();
            return CustomMetadataModel.unsafeDecode(response);
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    private async getAntivenomEntries(
        instanceRepository: InstanceRepository
    ): Promise<AntivenomEntries | undefined> {
        try {
            const dataStore = instanceRepository.getDataStore("snake-bite");
            const response = await dataStore.get("antivenomEntries").getData();
            return AntivenomEntriesModel.unsafeDecode(response);
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
                totalName: optionalSafe(string, ""),
                info: optionalSafe(string, ""),
            })
        ),
        {}
    ),
    optionCombos: optionalSafe(
        record(
            string,
            Codec.interface({
                name: optionalSafe(string, ""),
                info: optionalSafe(string, ""),
                order: optionalSafe(integer, 0),
            })
        ),
        {}
    ),
    adminUserGroups: optionalSafe(array(string), []),
    subnationalDataSet: optionalSafe(string, ""),
});

const AntivenomEntriesModel = Codec.interface({
    section: optionalSafe(integer, 0),
    groups: optionalSafe(
        array(
            Codec.interface({
                id: optionalSafe(string, ""),
                title: optionalSafe(string, ""),
                addEntryButton: optional(string),
                dataElements: optionalSafe(
                    array(
                        Codec.interface({
                            id: optionalSafe(string, ""),
                            prop: optionalSafe(string, ""),
                            recommendedProductsSelector: optionalSafe(boolean, false),
                            disabled: optionalSafe(boolean, false),
                        })
                    ),
                    []
                ),
            })
        ),
        []
    ),
});

type CustomMetadata = GetType<typeof CustomMetadataModel>;
type AntivenomEntries = GetType<typeof AntivenomEntriesModel>;
