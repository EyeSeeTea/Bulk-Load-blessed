import { generateUid } from "d2/uid";
import _ from "lodash";
import { DataElement, DataForm } from "../../../domain/entities/DataForm";
import {
    CustomTemplate,
    DataSource,
    DownloadCustomizationOptions,
    StyleSource,
} from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";
import { cache } from "../../../utils/cache";
import { GetSchemaType, Schema } from "../../../utils/codec";
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
        instanceRepository: InstanceRepository,
        options: DownloadCustomizationOptions
    ): Promise<void> {
        const { populate } = options;
        const { national, subnational } = await this.getDataForms(instanceRepository);
        const { metadata, antivenomEntries, antivenomProducts } = await this.readDataStore(
            instanceRepository
        );

        const getName = (id: string) => {
            return _([
                metadata?.dataElements[id]?.totalName,
                metadata?.optionCombos[id]?.name,
                national?.dataElements.find(de => de.id === id)?.name,
                _.flatMap(
                    national?.dataElements,
                    ({ categoryOptionCombos }) => categoryOptionCombos
                ).find(coc => coc?.id === id)?.name,
            ])
                .compact()
                .first();
        };

        const write = (sheet: string, column: string | number, row: number, value: string) =>
            excelRepository.writeCell(
                this.id,
                {
                    type: "cell" as const,
                    sheet: sheet,
                    ref: `${excelRepository.buildColumnName(column)}${row}`,
                },
                value
            );

        const defineName = (sheet: string, column: string, row: number, name: string) =>
            excelRepository.defineName(this.id, `_${name}`, {
                type: "cell" as const,
                sheet: sheet,
                ref: `${column}${row}`,
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
                    catIndex + 1,
                    offset + nationalStart + 2,
                    `=_${category.id}`
                );
            });
        });

        console.log({ populate, antivenomProducts });

        // Add antivenom product sheets
        await promiseMap(antivenomEntries.groups, async group => {
            const sheetName = group.name ?? group.id;
            await excelRepository.getOrCreateSheet(this.id, sheetName);

            await promiseMap(group.dataElements, async (dataElement, index) => {
                const name = getName(dataElement.id) ?? "";
                await write(sheetName, index + 1, 1, name);
            });
        });

        // Add metadata sheet
        await excelRepository.getOrCreateSheet(this.id, "Metadata");

        // Add metadata sheet columns
        await promiseMap(["Type", "Identifier", "Name", "Info"], (label, index) =>
            write("Metadata", index + 1, 1, label)
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
            const label = getName(id) ?? name;
            const info = metadata?.optionCombos[id]?.info ?? "";

            await write("Metadata", "A", index + metadataStart, type);
            await write("Metadata", "B", index + metadataStart, id);
            await write("Metadata", "C", index + metadataStart, label);
            await write("Metadata", "D", index + metadataStart, info);
        });

        await promiseMap(items, async ({ id }, index) => {
            await defineName("Metadata", "C", index + metadataStart, id);
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

    private async readDataStore(
        instanceRepository: InstanceRepository
    ): Promise<{
        metadata: CustomMetadata;
        antivenomEntries: AntivenomEntries;
        antivenomProducts: AntivenomProducts;
    }> {
        const dataStore = instanceRepository.getDataStore("snake-bite");
        const customMetadataResponse = await dataStore.get("customMetadata").getData();
        const antivenomEntriesResponse = await dataStore.get("antivenomEntries").getData();
        const antivenomProductsResponse = await dataStore.get("antivenomProducts").getData();

        const metadata = CustomMetadataModel.unsafeDecode(customMetadataResponse);
        const antivenomEntries = AntivenomEntriesModel.unsafeDecode(antivenomEntriesResponse);
        const antivenomProducts = AntivenomProductsModel.unsafeDecode(antivenomProductsResponse);

        return { metadata, antivenomEntries, antivenomProducts };
    }
}

const CustomMetadataModel = Schema.object({
    dataElements: Schema.optionalSafe(
        Schema.dictionary(
            Schema.string,
            Schema.object({
                totalName: Schema.optional(Schema.string),
                showName: Schema.optionalSafe(Schema.boolean, true),
                showTotal: Schema.optionalSafe(Schema.boolean, true),
                backgroundColor: Schema.optional(Schema.color),
                color: Schema.optional(Schema.color),
                info: Schema.optional(Schema.string),
            })
        ),
        {}
    ),
    optionCombos: Schema.optionalSafe(
        Schema.dictionary(
            Schema.string,
            Schema.object({
                name: Schema.optional(Schema.string),
                info: Schema.optional(Schema.string),
                order: Schema.optionalSafe(Schema.integer, 0),
                backgroundColor: Schema.optional(Schema.color),
                color: Schema.optional(Schema.color),
            })
        ),
        {}
    ),
    adminUserGroups: Schema.optionalSafe(Schema.array(Schema.string), []),
    subnationalDataSet: Schema.unknown,
});

const AntivenomEntriesModel = Schema.object({
    section: Schema.optionalSafe(Schema.integer, 0),
    groups: Schema.optionalSafe(
        Schema.array(
            Schema.object({
                id: Schema.optionalSafe(Schema.string, generateUid),
                name: Schema.optional(Schema.string),
                title: Schema.optional(Schema.string),
                addEntryButton: Schema.optional(Schema.string),
                dataElements: Schema.optionalSafe(
                    Schema.array(
                        Schema.object({
                            id: Schema.optionalSafe(Schema.string, generateUid),
                            prop: Schema.optionalSafe(Schema.string, ""),
                            recommendedProductsSelector: Schema.optionalSafe(Schema.boolean, false),
                            disabled: Schema.optionalSafe(Schema.boolean, false),
                        })
                    ),
                    []
                ),
            })
        ),
        []
    ),
});

const AntivenomProductsModel = Schema.array(
    Schema.object({
        monovalent: Schema.optionalSafe(Schema.boolean, false),
        polyvalent: Schema.optionalSafe(Schema.boolean, false),
        productName: Schema.optionalSafe(Schema.string, ""),
        recommended: Schema.optionalSafe(Schema.boolean, false),
        manufacturerName: Schema.optionalSafe(Schema.string, ""),
        categoryOptionComboId: Schema.optionalSafe(Schema.string, ""),
        deleted: Schema.optionalSafe(Schema.boolean, false),
    })
);

type CustomMetadata = GetSchemaType<typeof CustomMetadataModel>;
type AntivenomEntries = GetSchemaType<typeof AntivenomEntriesModel>;
type AntivenomProducts = GetSchemaType<typeof AntivenomProductsModel>;
