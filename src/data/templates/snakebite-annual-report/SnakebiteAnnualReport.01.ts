import { generateUid } from "d2/uid";
import _ from "lodash";
import { DataElement, DataForm } from "../../../domain/entities/DataForm";
import { DataPackage } from "../../../domain/entities/DataPackage";
import {
    CustomTemplate,
    DataSource,
    DownloadCustomizationOptions,
    ImportCustomizationOptions,
    StyleSource,
} from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";
import i18n from "../../../locales";
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
                    return _.range(30).map(offset => ({
                        type: "row",
                        orgUnit: { sheet, type: "cell", ref: "B3" },
                        period: { sheet, type: "cell", ref: "E3" },
                        dataElement: { sheet, type: "row", ref: 6 + offset * 5 },
                        categoryOption: { sheet, type: "row", ref: 7 + offset * 5 },
                        range: {
                            sheet,
                            rowStart: 8 + offset * 5,
                            rowEnd: 8 + offset * 5,
                            columnStart: "A",
                        },
                    }));
                case "Metadata":
                    return [];
                default:
                    return _.range(50).map(offset => ({
                        type: "row",
                        orgUnit: { sheet: "National", type: "cell", ref: "B3" },
                        period: { sheet: "National", type: "cell", ref: "E3" },
                        dataElement: { sheet, type: "row", ref: 1 },
                        categoryOption: { type: "value", id: generateUid() },
                        range: {
                            sheet,
                            rowStart: 2 + offset,
                            rowEnd: 2 + offset,
                            columnStart: "A",
                        },
                    }));
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
        const dataSet = await this.getDataForms(instanceRepository);
        const { metadata, antivenomEntries, antivenomProducts } = await this.readDataStore(
            instanceRepository
        );

        const getName = (id: string) => {
            return _([
                metadata?.dataElements[id]?.totalName,
                metadata?.optionCombos[id]?.name,
                dataSet?.dataElements.find(de => de.id === id)?.name,
                _.flatMap(
                    dataSet?.dataElements,
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
        > = dataSet?.sections
            ? _.flatMap(dataSet.sections, ({ id, name, dataElements }) =>
                  dataElements.map(dataElement => ({ ...dataElement, section: { id, name } }))
              )
            : dataSet?.dataElements ?? [];

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

        // TODO: Populate
        console.log({ populate, antivenomProducts });

        // Add antivenom product sheets
        await promiseMap(antivenomEntries.groups, async group => {
            const sheetName = group.name ?? group.id;
            await excelRepository.getOrCreateSheet(this.id, sheetName);

            await promiseMap(group.dataElements, async (dataElement, index) => {
                await write(sheetName, index + 1, 1, `=_${dataElement.id}`);
            });
        });

        // Add metadata sheet
        await excelRepository.getOrCreateSheet(this.id, "Metadata");

        // Add metadata sheet columns
        await promiseMap(["Type", "Identifier", "Name", "Info"], (label, index) =>
            write("Metadata", index + 1, 1, label)
        );

        // Add metadata sheet rows
        const items = _(dataSet?.dataElements)
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

    public async importCustomization(
        _excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository,
        options: ImportCustomizationOptions
    ): Promise<DataPackage | undefined> {
        const { dataPackage } = options;
        const dataSet = await this.getDataForms(instanceRepository);
        const { antivenomEntries, antivenomProducts } = await this.readDataStore(
            instanceRepository
        );

        const antivenomDataElements = _.flatMap(
            antivenomEntries.groups,
            ({ dataElements }) => dataElements
        );

        const antivenomDataElementIds = antivenomDataElements.map(({ id }) => id);

        const productNameDataElements = antivenomDataElements
            .filter(({ prop }) => prop === "productName")
            .map(({ id }) => id);

        const productByCategory = _(dataPackage.dataEntries)
            .flatMap(({ dataValues }) => dataValues)
            .groupBy("category")
            .mapValues(values => {
                const productItem = values.find(({ dataElement }) =>
                    productNameDataElements.includes(dataElement)
                );

                const product = antivenomProducts.find(
                    ({ productName }) => productName === productItem?.value
                );

                return product;
            })
            .value();

        const freeCategories = _(productNameDataElements)
            .map(id => dataSet?.dataElements.find(dataElement => dataElement.id === id))
            .compact()
            .groupBy("id")
            .mapValues(dataElements =>
                _.flatMap(
                    dataElements,
                    ({ categoryOptionCombos }) =>
                        categoryOptionCombos
                            ?.filter(
                                ({ id }) =>
                                    !antivenomProducts.find(
                                        ({ categoryOptionComboId }) => categoryOptionComboId === id
                                    )
                            )
                            .map(({ id }) => id) ?? []
                )
            )
            .value();

        const dataEntries = await promiseMap(
            dataPackage.dataEntries,
            async ({ dataValues, ...dataPackage }) => {
                const nationalDataValues = dataValues.filter(
                    ({ dataElement }) => !antivenomDataElementIds.includes(dataElement)
                );

                const [existingProducts, newProducts] = _.partition(dataValues, dataValue => {
                    const isProduct = antivenomDataElementIds.includes(dataValue.dataElement);
                    const exists = !!dataValue.category && !!productByCategory[dataValue.category];
                    return isProduct && exists;
                });

                const cleanExistingProducts = _.compact(
                    existingProducts.map(({ category = "", ...dataValue }) => {
                        const product = productByCategory[category];
                        // TODO: Filter data elements so that are not overwritten (manufacturer name, etc...)

                        return {
                            ...dataValue,
                            category: product?.categoryOptionComboId ?? category,
                        };
                    })
                );

                const cleanNewProducts = _(newProducts)
                    .groupBy("category")
                    .mapValues(dataValues => {
                        const productNameDataElement = dataValues.find(({ dataElement }) =>
                            productNameDataElements.includes(dataElement)
                        )?.dataElement;
                        if (!productNameDataElement) return [];

                        const [category] = _.pullAt(freeCategories[productNameDataElement], [0]);
                        if (!category) {
                            throw new Error(
                                i18n.t(
                                    "It is not possible to create products. The maximum number of products has been reached. Please contact your administrator."
                                )
                            );
                        }

                        return dataValues.map(dataValue => ({ ...dataValue, category }));
                    })
                    .values()
                    .flatten()
                    .value();

                // TODO: Update data store with new products

                return {
                    ...dataPackage,
                    dataValues: [
                        ...nationalDataValues,
                        ...cleanExistingProducts,
                        ...cleanNewProducts,
                    ],
                };
            }
        );

        return { type: "dataSets", dataEntries };
    }

    @cache()
    private async getDataForms(
        instanceRepository: InstanceRepository
    ): Promise<DataForm | undefined> {
        const dataForms = await instanceRepository.getDataForms({
            ids: ["XBgvNrxpcDC"],
            type: ["dataSets"],
        });

        return dataForms.find(({ id }) => id === "XBgvNrxpcDC");
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
