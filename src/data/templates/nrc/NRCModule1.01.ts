import _ from "lodash";
import "lodash.product";
import { NRCModuleMetadata } from "../../../domain/entities/templates/NRCModuleMetadata";
import { Id, NamedRef, Ref } from "../../../domain/entities/ReferenceObject";
import {
    CustomTemplateWithUrl,
    DataSource,
    DownloadCustomizationOptions,
    StyleSource,
} from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";
import { ModulesRepositories } from "../../../domain/repositories/ModulesRepositories";
import { NRCModuleMetadataRepository } from "../../../domain/repositories/templates/NRCModuleMetadataRepository";

export class NRCModule101 implements CustomTemplateWithUrl {
    public readonly type = "custom";

    public readonly id = "NRCmodule_v1";
    public readonly name = "NRCModule";
    public readonly description = "";
    public readonly url = "templates/NRCModule.xlsx";

    public readonly dataFormId = { type: "cell" as const, sheet: 0, ref: "F1" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };
    public readonly fixedPeriod = { type: "cell" as const, sheet: "Data Entry", ref: "D1" };

    public readonly dataSources: DataSource[] = [
        {
            type: "row",
            orgUnit: { sheet: "Data Entry", type: "column", ref: "A" },
            period: this.fixedPeriod,
            dataElement: { sheet: "Data Entry", type: "column", ref: "C" },
            categoryOption: { sheet: "Data Entry", type: "column", ref: "I" },
            attribute: { sheet: "Data Entry", type: "column", ref: "J" },
            range: { sheet: "Data Entry", rowStart: 4, columnStart: "F", columnEnd: "G" },
        },
    ];

    public readonly styleSources: StyleSource[] = [];

    public async downloadCustomization(
        excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository,
        modulesRepositories: ModulesRepositories,
        options: DownloadCustomizationOptions
    ): Promise<void> {
        return new DownloadCustomization(this.id, excelRepository, modulesRepositories.NRCModule, options).execute();
    }
}

class DownloadCustomization {
    initialValidationRow = 3;
    initialMetadataRow = 4;
    initialDataEntryRow = 4;
    password = "1234";

    sheets = {
        dataEntry: "Data Entry",
        validation: "Validation",
        metadata: "Metadata",
    };

    constructor(
        private id: Id,
        private excelRepository: ExcelRepository,
        private moduleRepository: NRCModuleMetadataRepository,
        private options: DownloadCustomizationOptions
    ) {}

    async execute() {
        await this.createSheet(this.sheets.validation);
        await this.createSheet(this.sheets.metadata);

        const metadata = await this.moduleRepository.get({ dataSetId: this.options.id });
        const workbookData = this.getSheetData(metadata);
        await this.fillWorkbook(workbookData);
    }

    private async createSheet(name: string) {
        await this.excelRepository.getOrCreateSheet(this.id, name);
    }

    private getValidationCells(metadata: NRCModuleMetadata) {
        const { categories } = metadata.categoryCombo;
        const projectCategoryOption = categories.project.categoryOption;

        const getCells = (items: Ref[], options: { column: string; useRef?: boolean }) => {
            const { useRef = true } = options;

            return items.map((item, idx) => {
                return cell({
                    sheet: this.sheets.validation,
                    column: options.column,
                    row: this.initialValidationRow + idx,
                    value: useRef ? referenceToId(item.id) : item.id,
                });
            });
        };

        return _.flatten([
            getCells(metadata.organisationUnits, { column: "A" }),
            getCells(categories.phasesOfEmergency.categoryOptions, { column: "B" }),
            getCells(categories.targetActual.categoryOptions, { column: "C" }),
            getCells(metadata.dataElements, { column: "D" }),
            getCells([metadata.dataSet], { column: "J" }),
            getCells([projectCategoryOption], { column: "H" }),
            getCells(metadata.periods, { column: "I", useRef: false }),
        ]);
    }

    private getSheetData(metadata: NRCModuleMetadata): WorkbookData {
        const validationCells = this.getValidationCells(metadata);
        const metadataCells = this.getMetadataCells(metadata);
        const aocCells = this.getAttributeOptionComboCells(metadata);
        const cocCells = this.getCategoryOptionComboCells(metadata);
        const miscCells = [
            cell({ sheet: this.sheets.dataEntry, column: "F", row: 1, value: referenceToId(metadata.dataSet.id) }),
        ];

        return {
            cells: _.concat(miscCells, validationCells, metadataCells, aocCells, cocCells),
        };
    }

    private getCategoryOptionComboCells(metadata: NRCModuleMetadata) {
        return _(metadata.dataElements)
            .flatMap(dataElement => {
                return dataElement.categoryCombo.categoryOptionCombos.map(coc => [dataElement, coc] as const);
            })
            .flatMap(([dataElement, coc], pairIdx) => {
                const row = this.initialDataEntryRow + pairIdx;

                return [
                    cell({
                        sheet: this.sheets.dataEntry,
                        column: "S",
                        row: row,
                        value: dataElement.id,
                    }),
                    cell({
                        sheet: this.sheets.dataEntry,
                        column: "T",
                        row: row,
                        value: referenceToId(coc.id),
                    }),
                ];
            })
            .value();
    }

    private getAttributeOptionComboCells(metadata: NRCModuleMetadata) {
        const { categories } = metadata.categoryCombo;
        const projectCategoryOption = categories.project.categoryOption;

        const categoryOptionsProduct = _.product(
            [categories.project.categoryOption],
            categories.phasesOfEmergency.categoryOptions,
            categories.targetActual.categoryOptions
        );

        const cocsByKey = _.keyBy(metadata.categoryCombo.categoryOptionCombos, getCocKey);

        const projectCategoryOptionCell = cell({
            sheet: this.sheets.dataEntry,
            column: "B",
            row: 1,
            value: referenceToId(projectCategoryOption.id),
        });

        const aocCells = _(categoryOptionsProduct)
            .map(categoryOptions => {
                const key = getCocKey({ categoryOptions });
                const coc = cocsByKey[key];
                if (!coc) {
                    console.error(`Category option combo not found: categoryOptionIds=${key}`);
                    return null;
                } else {
                    return { categoryOptions, categoryOptionCombo: coc };
                }
            })
            .compact()
            .flatMap((obj, idx) => {
                return _.zip([obj.categoryOptionCombo, ...obj.categoryOptions], ["J", "K", "L", "M"]).map(
                    ([obj, column]) => {
                        if (!obj || !column) return null;

                        return cell({
                            sheet: this.sheets.dataEntry,
                            column: column,
                            row: this.initialDataEntryRow + idx,
                            value: obj.id,
                        });
                    }
                );
            })
            .compact()
            .concat([projectCategoryOptionCell])
            .value();

        return aocCells;
    }

    private getMetadataCells(metadata: NRCModuleMetadata) {
        const { categories } = metadata.categoryCombo;
        const projectCategoryOption = categories.project.categoryOption;

        const categoryOptions = _([projectCategoryOption])
            .concat(categories.phasesOfEmergency.categoryOptions)
            .concat(categories.targetActual.categoryOptions)
            .value();

        const categoryOptionCombos = _(metadata.dataElements)
            .flatMap(dataElement => dataElement.categoryCombo.categoryOptionCombos)
            .concat(metadata.categoryCombo.categoryOptionCombos)
            .uniqBy(coc => coc.id)
            .value();

        const metadataObj: Array<{ metadataType: string; items: NamedRef[] }> = [
            { metadataType: "dataSets", items: [metadata.dataSet] },
            { metadataType: "categoryOptions", items: categoryOptions },
            { metadataType: "organisationUnits", items: metadata.organisationUnits },
            { metadataType: "dataElements", items: metadata.dataElements },
            { metadataType: "categoryOptionCombos", items: categoryOptionCombos },
        ];

        return _(metadataObj)
            .flatMap(({ metadataType, items }) => items.map(item => ({ metadataType, item })))
            .sortBy(({ metadataType, item }) => [metadataType, "-", item.name.toLowerCase()].join(""))
            .flatMap(({ metadataType, item }, idx) => {
                const row = this.initialMetadataRow + idx;

                const cells = [
                    { column: "A", value: item.id },
                    { column: "B", value: metadataType },
                    { column: "C", value: item.name, id: item.id },
                    { column: "D", value: `=B${row}&"-"&C${row}` },
                ];

                return cells.map(obj => cell({ sheet: this.sheets.metadata, row: row, ...obj }));
            })
            .value();
    }

    private async fillWorkbook(sheetData: WorkbookData) {
        const { excelRepository } = this;

        for (const cell of sheetData.cells) {
            await excelRepository.writeCell(
                this.id,
                {
                    type: "cell" as const,
                    sheet: cell.sheet,
                    ref: cell.ref,
                },
                cell.value
            );
        }

        // Defined names must be set after cell values, as writeCell looks for existing names.

        for (const cell of sheetData.cells) {
            if (!cell.id) continue;

            await excelRepository.defineName(this.id, nameForId(cell.id), {
                type: "cell" as const,
                sheet: cell.sheet,
                ref: cell.ref,
            });
        }

        excelRepository.protectSheet(this.id, this.sheets.validation, this.password);
        excelRepository.protectSheet(this.id, this.sheets.metadata, this.password);
    }
}

interface Cell {
    sheet: string;
    ref: string;
    value: string;
    id?: Id;
}

interface WorkbookData {
    cells: Cell[];
}

function nameForId(id: Id): string {
    return `_${id}`;
}

function referenceToId(id: Id): string {
    return `=${nameForId(id)}`;
}

function getCocKey(categoryOptionCombo: { categoryOptions: Ref[] }): string {
    return _(categoryOptionCombo.categoryOptions)
        .map(co => co.id)
        .sortBy()
        .join(".");
}

function cell(options: { sheet: string; column: string; row: number; value: string; id?: Id }): Cell {
    return {
        sheet: options.sheet,
        ref: `${options.column}${options.row}`,
        value: options.value,
        id: options.id,
    };
}
