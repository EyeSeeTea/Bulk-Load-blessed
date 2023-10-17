import _ from "lodash";
import "lodash.product";
import { Id } from "../../../domain/entities/ReferenceObject";
import {
    CustomTemplateWithUrl,
    DataSource,
    DownloadCustomizationOptions,
    StyleSource,
} from "../../../domain/entities/Template";
import {
    CategoryCombo,
    CategoryOption,
    DataElement,
    MSFModuleMetadata,
} from "../../../domain/entities/templates/MSFModuleMetadata";
import { ThemeStyle } from "../../../domain/entities/Theme";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";
import { ModulesRepositories } from "../../../domain/repositories/ModulesRepositories";
import { MSFModuleMetadataRepository } from "../../../domain/repositories/templates/MSFModuleMetadataRepository";
import { Maybe } from "../../../types/utils";
import { Workbook } from "../../../webapp/logic/Workbook";

const DEFAULT_COLUMN_COLOR = "#000000";
const DEFAULT_SECTION_BG_COLOR = "#f2f2f2";
const DEFAULT_DE_CELL_BG_COLOR = "#ffffff";

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

    password = "Wiscentd2019!";

    sheets = {
        mapping: "mapping",
        entryForm: "Entry form",
        dataEntry: "Data Entry",
        validation: "Validation",
    };

    sectionCellStyle = {
        bold: true,
        fontSize: 12,
        merged: true,
        horizontalAlignment: "left",
        fillColor: DEFAULT_SECTION_BG_COLOR,
    } as ThemeStyle;

    dataElementCellStyle = {
        border: true,
        fillColor: DEFAULT_DE_CELL_BG_COLOR,
        merged: true,
    };

    headerCellStyle = {
        bold: true,
        fontSize: 12,
        merged: true,
        horizontalAlignment: "center",
        fillColor: DEFAULT_SECTION_BG_COLOR,
    } as ThemeStyle;

    combinationCellStyle = {
        border: true,
        fontSize: 10,
        fillColor: DEFAULT_DE_CELL_BG_COLOR,
        horizontalAlignment: "center",
    } as ThemeStyle;

    async execute() {
        const dataEntryCells = await this.getDataEntryCombinationsCells();
        const metadata = await this.moduleRepository.get({
            dataSetId: this.options.id,
            catOptionCombinationIds: _(dataEntryCells)
                .map(cell => this.getIdFromCellFormula(cell.value))
                .compact()
                .value(),
        });
        const cells = this.createSectionCells(metadata);

        await this.fillEntryForm(cells);
        await this.fillMapping(metadata, cells, dataEntryCells);
        await this.setPeriodDataValidation();
        await this.setMappingAsDone();
    }

    private async fillMapping(metadata: MSFModuleMetadata, cells: Cell[], dataEntryCells: CellWithCombinationId[]) {
        const combinationCells = cells.filter(cell => cell.includeInMapping);
        const mappingCells = this.createMappingCells(metadata, combinationCells, dataEntryCells);

        for (const cell of mappingCells) {
            await this.excelRepository.writeCell(
                this.templateId,
                { type: "cell", sheet: cell.sheet, ref: cell.ref },
                cell.value
            );
        }
    }

    private async fillEntryForm(cells: Cell[]): Promise<void> {
        for (const cell of cells) {
            if (cell.merge) {
                await this.excelRepository.mergeCells(this.templateId, {
                    sheet: cell.sheet,
                    rowStart: cell.merge.rowStart,
                    rowEnd: cell.merge.rowEnd,
                    columnStart: cell.merge.columnStart,
                    columnEnd: cell.merge.columnEnd,
                });
            }
            await this.excelRepository.writeCell(
                this.templateId,
                { type: "cell", sheet: cell.sheet, ref: cell.ref },
                cell.value
            );
            if (cell.style) {
                await this.excelRepository.styleCell(
                    this.templateId,
                    {
                        ref: cell.merge
                            ? `${cell.merge.columnStart}${cell.merge.rowStart}:${cell.merge.columnEnd}${cell.merge.rowEnd}`
                            : cell.ref,
                        sheet: cell.sheet,
                        type: cell.merge ? "range" : "cell",
                    },
                    cell.style
                );
            }
        }
    }

    private async setPeriodDataValidation(): Promise<void> {
        const periodStartRow = 3;
        const validationSheet = this.sheets.validation;
        const cells = await this.excelRepository.getCellsInRange(this.templateId, {
            sheet: validationSheet,
            columnStart: "B",
            columnEnd: "B",
            rowStart: periodStartRow,
        });

        const lastCell = _(cells).last();
        if (lastCell) {
            const rowNumberFromRef = lastCell.ref.substring(1);
            this.excelRepository.setDataValidation(
                this.templateId,
                {
                    ref: "J11",
                    sheet: this.sheets.entryForm,
                    type: "cell",
                },
                `=${this.sheets.validation}!$B$${periodStartRow}:$B${rowNumberFromRef}`
            );
        }
    }

    private async getDataEntryCombinationsCells(): Promise<CellWithCombinationId[]> {
        const dataEntrySheet = this.sheets.dataEntry;
        const cellsCatOptComb = await this.excelRepository.getCellsInRange(this.templateId, {
            sheet: dataEntrySheet,
            columnStart: "D",
            rowStart: 5,
            rowEnd: 5,
        });

        const result = [];

        for (const cell of cellsCatOptComb) {
            const value = await this.excelRepository.readCell(this.templateId, cell);
            if (value) {
                const column = this.removeLastChar(cell.ref);
                const lastChar = Number(_(cell.ref).last());
                const deValue = await this.excelRepository.readCell(this.templateId, {
                    ...cell,
                    ref: `${column}${lastChar - 1}`,
                });
                if (!deValue) throw Error(`Cannot get dataElement for categoryOptionCombo from cell: ${cell.ref}`);
                result.push({
                    sheet: dataEntrySheet,
                    ref: cell.ref,
                    value: value.toString(),
                    column: column,
                    dataElementId: deValue.toString().replace("_", ""),
                });
            }
        }

        return result;
    }

    private removeLastChar(value: string): string {
        return value.slice(0, -1);
    }

    private getIdFromCellFormula(value: string): string {
        return value.replace("_", "");
    }

    private createSectionCells(metadata: MSFModuleMetadata): Cell[] {
        const initialSectionRefCell = Workbook.getColumnIndex("G");
        const initialSectionletter = Workbook.getExcelAlpha(initialSectionRefCell);

        const deByKeys = _.keyBy(metadata.dataSet.dataSetElements, dse => dse.dataElement.id);
        const spaceBetweenSections = 1;
        const spaceAtEndOfSection = 1;
        const initialSectionRowNumber = 17;

        const totalRowsPerSection = _(metadata.dataSet.sections)
            .map(section => {
                const firstDe = _(section.dataElements).first();
                if (!firstDe) return undefined;
                const dataElement = deByKeys[firstDe.id];
                if (!dataElement) return undefined;
                return section.dataElements.length + dataElement.categoryCombo.categories.length;
            })
            .compact()
            .value();

        const cells = _(metadata.dataSet.sections)
            .map((section, sectionIndex) => {
                const firstDe = _(section.dataElements).first();
                if (!firstDe) return undefined;

                const dataElement = deByKeys[firstDe.id];

                if (!dataElement) return undefined;
                const totalCategories = dataElement.categoryCombo.categories.length;

                const sumTotalRowsPerSection = _(totalRowsPerSection).slice(0, sectionIndex).sum();

                const currentSpaces = (spaceBetweenSections + spaceAtEndOfSection) * sectionIndex;

                const initialSectionCellNumber =
                    sectionIndex === 0
                        ? initialSectionRowNumber
                        : initialSectionRowNumber + sumTotalRowsPerSection + currentSpaces;

                const sectionColumnEndLetter = Workbook.getExcelAlpha(initialSectionRefCell + 4);

                const sectionNameCell: Cell = {
                    ref: `${initialSectionletter}${initialSectionCellNumber}`,
                    sheet: this.sheets.entryForm,
                    value: section.name,
                    style: this.sectionCellStyle,
                    includeInMapping: false,
                    merge: {
                        rowStart: initialSectionCellNumber,
                        rowEnd: initialSectionCellNumber,
                        columnStart: initialSectionletter,
                        columnEnd: sectionColumnEndLetter,
                    },
                    metadata: undefined,
                };

                const headerColumnIndex = Workbook.getColumnIndex("L");

                const allCategoryOptions = dataElement.categoryCombo.categories.map(
                    category => category.categoryOptions
                );
                const productCategories = _.product(...allCategoryOptions);
                const columnsGroups = this.generateColumnsCombinations(dataElement);
                const fontColors = this.generateColors(totalCategories);

                // Headers from Category Options
                const cellsHeaders = columnsGroups.flatMap((columnGroup, colGroupIndex) => {
                    const quantityMergeCells = productCategories.length / columnGroup.length;
                    return columnGroup.map((cell, cellIndex) => {
                        const nextLetter = cellIndex * quantityMergeCells;
                        const headerLetter = Workbook.getExcelAlpha(headerColumnIndex + nextLetter);
                        const rowNumber = initialSectionCellNumber + colGroupIndex;

                        const endMergeIndex = Workbook.getColumnIndex(headerLetter);
                        const endMergeLetter = Workbook.getExcelAlpha(endMergeIndex + (quantityMergeCells - 1));

                        const newCell: Cell = {
                            ...cell,
                            ref: `${headerLetter}${rowNumber}`,
                            style: {
                                ...this.headerCellStyle,
                                fontColor: fontColors[colGroupIndex] || DEFAULT_COLUMN_COLOR,
                            },
                            merge: {
                                rowStart: rowNumber,
                                rowEnd: rowNumber,
                                columnStart: headerLetter,
                                columnEnd: endMergeLetter,
                            },
                            includeInMapping: false,
                        };
                        return newCell;
                    });
                });

                const cellsDe = _(section.dataElements)
                    .map((sectionDe, deIndex) => {
                        const currentDe = deByKeys[sectionDe.id];
                        if (!currentDe) return undefined;
                        const rowNumber = initialSectionCellNumber + totalCategories + deIndex;
                        const endMergeIndex = Workbook.getColumnIndex(initialSectionletter);
                        const endMergeLetter = Workbook.getExcelAlpha(endMergeIndex + 3);

                        const deIndeCell: Cell = {
                            sheet: this.sheets.entryForm,
                            ref: `F${rowNumber}`,
                            value: String(sectionIndex + 1),
                            includeInMapping: false,
                            style: undefined,
                            merge: undefined,
                            metadata: undefined,
                        };

                        const deCell: Cell = {
                            sheet: this.sheets.entryForm,
                            ref: `${initialSectionletter}${rowNumber}`,
                            value: sectionDe.name,
                            style: this.dataElementCellStyle,
                            includeInMapping: false,
                            merge: {
                                rowStart: rowNumber,
                                rowEnd: rowNumber,
                                columnStart: initialSectionletter,
                                columnEnd: endMergeLetter,
                            },
                            metadata: undefined,
                        };

                        const combinationsCells = productCategories.map((record, productIndex): Cell => {
                            const combColumnIndex = Workbook.getColumnIndex("L");
                            const combLetter = Workbook.getExcelAlpha(combColumnIndex + productIndex);
                            return {
                                sheet: this.sheets.entryForm,
                                ref: `${combLetter}${initialSectionCellNumber + totalCategories + deIndex}`,
                                value: "",
                                style: this.combinationCellStyle,
                                includeInMapping: true,
                                metadata: {
                                    dataElement: {
                                        id: sectionDe.id,
                                        name: sectionDe.name,
                                    },
                                    categoryOptions: record.map(r => r.id),
                                },
                                merge: undefined,
                            };
                        });

                        return [deIndeCell, deCell, ...combinationsCells];
                    })
                    .compact()
                    .flatMap()
                    .value();

                return [sectionNameCell, ...cellsHeaders, ...cellsDe];
            })
            .compact()
            .flatMap()
            .value();

        return cells;
    }

    private createMappingCells(
        metadata: MSFModuleMetadata,
        combinationCells: Cell[],
        dataEntryCells: CellWithCombinationId[]
    ): Cell[] {
        const cells = _(combinationCells)
            .flatMap((cell, index) => {
                if (!cell.metadata) return undefined;
                const rowNumber = index + 1;

                const combinationCell: Cell = {
                    sheet: this.sheets.mapping,
                    includeInMapping: false,
                    value: cell.ref,
                    ref: `A${rowNumber}`,
                    style: undefined,
                    merge: undefined,
                    metadata: undefined,
                };

                const categoryOptionCombo = metadata.categoryOptionCombos.find(coc => {
                    const ids = coc.categoryOptions.map(categoryOption => categoryOption.id);
                    return _.isEqual(_.sortBy(ids), _.sortBy(cell.metadata?.categoryOptions));
                });

                if (!categoryOptionCombo) return undefined;

                const dataEntryCell = dataEntryCells.find(
                    dec =>
                        this.getIdFromCellFormula(dec.value) === categoryOptionCombo.id &&
                        dec.dataElementId === cell.metadata?.dataElement.id
                );
                if (!dataEntryCell) return undefined;

                const dataEntryCocCell: Cell = {
                    sheet: this.sheets.mapping,
                    includeInMapping: false,
                    value: dataEntryCell.column,
                    ref: `B${rowNumber}`,
                    style: undefined,
                    merge: undefined,
                    metadata: undefined,
                };

                const dataElementCell: Cell = {
                    sheet: this.sheets.mapping,
                    value: cell.metadata?.dataElement.name || "",
                    ref: `E${rowNumber}`,
                    includeInMapping: false,
                    style: undefined,
                    merge: undefined,
                    metadata: undefined,
                };

                return [
                    combinationCell,
                    dataEntryCocCell,
                    dataElementCell,
                    { ...dataElementCell, ref: `F${rowNumber}` },
                ];
            })
            .compact()
            .value();

        return cells;
    }

    private generateColumnsCombinations({ categoryCombo }: { categoryCombo: CategoryCombo }): Cell[][] {
        const result = categoryCombo.categories.reduce<ReduceCombinations>(
            (acum, category) => {
                const cartesian =
                    acum.prevCatOptions.length > 0
                        ? _.product(...acum.prevCatOptions, category.categoryOptions)
                        : _.product(category.categoryOptions);

                acum.prevCatOptions.push(category.categoryOptions);

                const columnsRows = _(cartesian)
                    .map(product => {
                        const lastItem = _(product).last();
                        return lastItem
                            ? {
                                  ref: "",
                                  value: lastItem.name !== "default" ? lastItem.name : "",
                                  sheet: this.sheets.entryForm,
                                  includeInMapping: false,
                                  style: undefined,
                                  metadata: undefined,
                                  merge: undefined,
                              }
                            : undefined;
                    })
                    .compact()
                    .value();

                acum.cells.push(columnsRows);

                return acum;
            },
            {
                prevCatOptions: [],
                cells: [],
            }
        );
        return result.cells;
    }

    private async setMappingAsDone() {
        await this.excelRepository.writeCell(
            this.templateId,
            { type: "cell", sheet: this.sheets.mapping, ref: "C1" },
            1
        );
        await this.excelRepository.protectSheet(this.templateId, this.sheets.mapping, this.password);
    }

    private generateColors(numberOfColorsToGenerate: number): string[] {
        const colors = Array.from({ length: numberOfColorsToGenerate }, (_, i) =>
            i === 0 ? DEFAULT_COLUMN_COLOR : ""
        );

        const lighterColors = colors.map((_, i) =>
            i === 0 ? DEFAULT_COLUMN_COLOR : this.makeColorLighter(colors[i - 1] || "")
        );
        return lighterColors;
    }

    private makeColorLighter(color: string): string {
        const getHexValue = (channel: number) => {
            const value = parseInt(color.slice(channel, channel + 2), 16);
            const newValue = Math.min(255, Math.max(0, value + 50));
            return newValue.toString(16).padStart(2, "0");
        };

        return `#${getHexValue(1)}${getHexValue(3)}${getHexValue(5)}`;
    }
}

type BaseCell = {
    sheet: string;
    ref: string;
    value: string;
};

export interface Cell extends BaseCell {
    style: Maybe<ThemeStyle>;
    includeInMapping: boolean;
    merge: Maybe<MergeCell>;
    metadata: Maybe<{
        dataElement: DataElement;
        categoryOptions: Id[];
    }>;
}

type MergeCell = {
    rowStart: number;
    rowEnd: number;
    columnStart: string;
    columnEnd: string;
};

type ReduceCombinations = {
    prevCatOptions: CategoryOption[][];
    cells: Cell[][];
};

interface CellWithCombinationId extends BaseCell {
    column: string;
    dataElementId: Id;
}
