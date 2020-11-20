import _ from "lodash";
import { promiseMap } from "../../webapp/utils/promises";
import { DataPackage, DataPackageData } from "../entities/DataPackage";
import {
    CellDataSource,
    CellRef,
    DataSource,
    DataSourceValue,
    SheetRef,
    Template,
    ValueRef,
    TeiRowDataSource,
    ColumnRef,
    GenericSheetRef,
    TrackerRelationship,
    TrackerEventRowDataSource,
} from "../entities/Template";
import { ExcelRepository, ExcelValue, ReadCellOptions } from "../repositories/ExcelRepository";
import { TrackedEntityInstance, AttributeValue } from "../entities/TrackedEntityInstance";
import { removeCharacters } from "../../utils/string";
import { Relationship } from "../entities/Relationship";
import moment from "moment";
import XlsxPopulate from "xlsx-populate";
import { generateUid } from "d2/uid";

const dateFormat = "YYYY-MM-DD";

export class ExcelReader {
    constructor(private excelRepository: ExcelRepository) {}

    public async readTemplate(template: Template): Promise<DataPackage | undefined> {
        const { dataSources = [] } = template;

        const dataFormType = await this.readCellValue(template, template.dataFormType);
        const dataSourceValues = await this.getDataSourceValues(template, dataSources);

        if (
            dataFormType !== "dataSets" &&
            dataFormType !== "programs" &&
            dataFormType !== "trackerPrograms"
        ) {
            return undefined;
        }

        const data: DataPackageData[] = [];
        const teis: TrackedEntityInstance[] = [];
        const relationships: Relationship[] = [];

        for (const dataSource of dataSourceValues) {
            switch (dataSource.type) {
                case "cell":
                    data.push(...(await this.readByCell(template, dataSource)));
                    break;
                case "rowTei":
                    teis.push(...(await this.readTeiRows(template, dataSource)));
                    break;
                case "rowTeiRelationship":
                    relationships.push(...(await this.readTeiRelationships(template, dataSource)));
                    break;
                case "rowTrackedEvent":
                    data.push(...(await this.readTeiEvents(template, dataSource, teis)));
                    break;
                default:
                    throw new Error(`Type ${dataSource.type} not supported`);
            }
        }

        const dataEntries = _(data)
            .groupBy(d =>
                [
                    d.dataForm,
                    d.id,
                    d.period,
                    d.orgUnit,
                    d.attribute,
                    d.trackedEntityInstance,
                    d.programStage,
                ].join("@")
            )
            .map((items, key) => {
                const [
                    dataForm,
                    id,
                    period,
                    orgUnit,
                    attribute,
                    trackedEntityInstance,
                    programStage,
                ] = key.split("@");
                return {
                    dataForm,
                    id: id ? String(id) : undefined,
                    orgUnit: String(orgUnit),
                    period: String(period),
                    attribute: attribute ? String(attribute) : undefined,
                    trackedEntityInstance: trackedEntityInstance
                        ? String(trackedEntityInstance)
                        : undefined,
                    programStage: programStage ? String(programStage) : undefined,
                    dataValues: _.flatMap(items, ({ dataValues }) => dataValues),
                };
            })
            .value();

        if (dataFormType === "trackerPrograms") {
            const trackedEntityInstances = this.addTeiRelationships(teis, relationships);
            console.log({ dataEntries, trackedEntityInstances });
            return { type: "trackerPrograms", dataEntries, trackedEntityInstances };
        } else {
            return { type: dataFormType, dataEntries };
        }
    }

    private async readByCell(
        template: Template,
        dataSource: CellDataSource
    ): Promise<DataPackageData[]> {
        const cell = await this.excelRepository.findRelativeCell(template.id, dataSource.ref);
        const value = cell ? await this.readCellValue(template, cell) : undefined;

        const dataFormId = await this.readCellValue(template, template.dataFormId);
        const orgUnit = await this.readCellValue(template, dataSource.orgUnit);
        const period = await this.readCellValue(template, dataSource.period);
        const dataElement = await this.readCellValue(template, dataSource.dataElement);
        const category = await this.readCellValue(template, dataSource.categoryOption);
        const attribute = await this.readCellValue(template, dataSource.attribute);
        const eventId = await this.readCellValue(template, dataSource.eventId);

        if (!orgUnit || !period || !dataElement || !dataFormId || !value) {
            return [];
        }

        return [
            {
                dataForm: String(dataFormId),
                id: eventId ? String(eventId) : undefined,
                orgUnit: String(orgUnit),
                period: String(period),
                attribute: attribute ? String(attribute) : undefined,
                dataValues: [
                    {
                        dataElement: String(dataElement),
                        category: String(category),
                        value: this.formatValue(value),
                    },
                ],
            },
        ];
    }

    private async getFormulaCell(template: Template, ref: CellRef | ValueRef): Promise<ExcelValue> {
        return removeCharacters(
            await this.excelRepository.readCell(template.id, ref, { formula: true })
        );
    }

    private async getRowIndexes(
        template: Template,
        ref: GenericSheetRef,
        rowStart: number
    ): Promise<number[]> {
        const rowsCount = await this.excelRepository.getSheetRowsCount(template.id, ref.sheet);
        return rowsCount ? _.range(rowStart, rowsCount + 1, 1) : [];
    }

    private async getFormulaValue(template: Template, columnRef: ColumnRef, rowIndex: number) {
        return removeCharacters(
            await this.getCellValue(template, columnRef, rowIndex, {
                formula: true,
            })
        );
    }

    private addTeiRelationships(
        teis: TrackedEntityInstance[],
        relationships: Relationship[]
    ): TrackedEntityInstance[] {
        const relationshipsByFromId = _.groupBy(relationships, relationship => relationship.fromId);
        const relationshipsByToId = _.groupBy(relationships, relationship => relationship.toId);
        return teis.map(tei => ({
            ...tei,
            relationships: _.concat(
                relationshipsByFromId[tei.id] || [],
                relationshipsByToId[tei.id] || []
            ),
        }));
    }

    private async readTeiEvents(
        template: Template,
        dataSource: TrackerEventRowDataSource,
        teis: TrackedEntityInstance[]
    ): Promise<DataPackageData[]> {
        const rowStart = 3;
        const getCell = this.getCellValue.bind(this);

        const programId = await this.getFormulaCell(template, template.dataFormId);
        const rowIndexes = await this.getRowIndexes(template, dataSource.teiId, rowStart);
        const teiById = _.keyBy(teis, tei => tei.id);
        if (!programId) return [];

        const programStageId = await this.getFormulaCell(template, dataSource.programStage);

        const dataElementCells = await this.excelRepository.getCellsInRange(
            template.id,
            dataSource.dataElements
        );

        const dataElementIds = await promiseMap(dataElementCells, cell =>
            this.excelRepository.readCell(template.id, cell, { formula: true })
        );

        const events = await promiseMap(
            rowIndexes,
            async (rowIdx): Promise<DataPackageData[]> => {
                const teiId = await getCell(template, dataSource.teiId, rowIdx);
                const cocId = await this.getFormulaValue(
                    template,
                    dataSource.categoryOptionCombo,
                    rowIdx
                );
                const eventId = await getCell(template, dataSource.eventId, rowIdx);
                const date = parseDate(await getCell(template, dataSource.date, rowIdx));
                if (!teiId || !date) return [];

                const tei = teiById[String(teiId)];
                if (!tei) return [];

                const valuesCells = await this.excelRepository.getCellsInRange(template.id, {
                    ...dataSource.dataElements,
                    rowStart: rowIdx,
                    rowEnd: rowIdx,
                });

                const dataItems = await promiseMap(valuesCells, async valueCell => {
                    return {
                        value: await this.excelRepository.readCell(template.id, valueCell),
                        optionId: await this.excelRepository.readCell(template.id, valueCell, {
                            formula: true,
                        }),
                    };
                });

                const dataList = _.zip(dataItems, dataElementIds).map(([item, deIdFormula]) => {
                    const dataElementId = deIdFormula ? removeCharacters(deIdFormula) : null;
                    if (!item || !programStageId || !dataElementId || !programStageId) return null;

                    const { value, optionId } = item;

                    const data: DataPackageData = {
                        id: eventId ? String(eventId) : undefined,
                        dataForm: String(programId),
                        orgUnit: tei.orgUnit.id,
                        period: String(date),
                        attribute: cocId,
                        trackedEntityInstance: String(teiId),
                        programStage: String(programStageId),
                        dataValues: [
                            {
                                dataElement: String(dataElementId),
                                value: this.formatValue(value),
                                optionId: optionId ? removeCharacters(optionId) : undefined,
                            },
                        ],
                    };
                    return data;
                });

                return _.compact(dataList);
            }
        );

        return _.flatten(events);
    }

    private async readTeiRelationships(
        template: Template,
        dataSource: TrackerRelationship
    ): Promise<Relationship[]> {
        const rowStart = dataSource.range.rowStart;
        const programId = await this.getFormulaCell(template, template.dataFormId);
        if (!programId) return [];
        const typeName = await this.excelRepository.readCell(
            template.id,
            dataSource.relationshipType
        );
        const typeId = await this.getFormulaCell(template, dataSource.relationshipType);

        const getCell = this.getCellValue.bind(this);
        const rowIndexes = await this.getRowIndexes(template, dataSource.from, rowStart);

        const relationships = await promiseMap<number, Relationship | undefined>(
            rowIndexes,
            async rowIdx => {
                const fromTeiId = await getCell(template, dataSource.from, rowIdx);
                const toTeiId = await getCell(template, dataSource.to, rowIdx);
                if (!fromTeiId || !toTeiId || !typeId) return;

                const relationship: Relationship = {
                    typeId: String(typeId),
                    typeName: String(typeName),
                    fromId: String(fromTeiId),
                    toId: String(toTeiId),
                };
                return relationship;
            }
        );

        return _.compact(relationships);
    }

    private async readTeiRows(
        template: Template,
        dataSource: TeiRowDataSource
    ): Promise<TrackedEntityInstance[]> {
        const rowStart = 6;
        const getCell = this.getCellValue.bind(this);

        const programId = await this.getFormulaCell(template, template.dataFormId);
        const rowIndexes = await this.getRowIndexes(template, dataSource.teiId, rowStart);
        if (!programId) return [];

        const values = await promiseMap<number, TrackedEntityInstance | undefined>(
            rowIndexes,
            async rowIdx => {
                // Generate random one UID for TEI if empty.
                const teiId = (await getCell(template, dataSource.teiId, rowIdx)) || generateUid();
                const orgUnitId = await this.getFormulaValue(template, dataSource.orgUnit, rowIdx);
                const enrollmentDate = parseDate(
                    await getCell(template, dataSource.enrollmentDate, rowIdx)
                );
                const incidentDate = parseDate(
                    await getCell(template, dataSource.incidentDate, rowIdx)
                );

                const attributeCells = await this.excelRepository.getCellsInRange(template.id, {
                    ...dataSource.attributes,
                    rowStart: rowIdx,
                    rowEnd: rowIdx,
                });

                console.log({ teiId, orgUnitId, enrollmentDate });

                if (!teiId || !orgUnitId || !enrollmentDate) return;

                const attributeValues = [];
                for (const cell of attributeCells) {
                    const attributeIdCell = await this.excelRepository.findRelativeCell(
                        template.id,
                        dataSource.attributeId,
                        cell
                    );

                    const attributeId = attributeIdCell
                        ? removeCharacters(
                              await this.excelRepository.readCell(template.id, attributeIdCell, {
                                  formula: true,
                              })
                          )
                        : undefined;

                    if (!attributeId) continue;

                    const attributeValueVal = await this.excelRepository.readCell(
                        template.id,
                        cell
                    );

                    const attributeValueFormula = await this.excelRepository.readCell(
                        template.id,
                        cell,
                        { formula: true }
                    );

                    const attributeValue: AttributeValue = {
                        attribute: { id: attributeId },
                        value: attributeValueVal !== undefined ? String(attributeValueVal) : "",
                        optionId: attributeValueFormula
                            ? removeCharacters(attributeValueFormula)
                            : undefined,
                    };

                    attributeValues.push(attributeValue);
                }

                const trackedEntityInstance: TrackedEntityInstance = {
                    program: { id: String(programId) },
                    id: String(teiId),
                    orgUnit: { id: orgUnitId },
                    disabled: false,
                    attributeValues,
                    enrollment: {
                        enrollmentDate: this.formatValue(enrollmentDate),
                        incidentDate: this.formatValue(incidentDate || enrollmentDate),
                    },
                    relationships: [],
                };

                return trackedEntityInstance;
            }
        );

        return _.compact(values);
    }

    private async getCellValue(
        template: Template,
        columnRef: ColumnRef,
        rowIndex: number,
        options?: ReadCellOptions
    ): Promise<ExcelValue> {
        const relative: CellRef = {
            ...columnRef,
            type: "cell",
            ref: columnRef.ref + rowIndex.toString(),
        };

        const cell = await this.excelRepository.findRelativeCell(template.id, columnRef, relative);
        if (!cell) return "";
        const value = await this.excelRepository.readCell(template.id, cell, options);
        return value === undefined ? "" : value;
    }

    private async readCellValue(template: Template, ref?: SheetRef | ValueRef, relative?: CellRef) {
        if (!ref) return undefined;
        if (ref.type === "value") return ref.id;
        const cell = await this.excelRepository.findRelativeCell(template.id, ref, relative);
        if (cell) {
            const value = await this.excelRepository.readCell(template.id, cell);
            const formula = await this.excelRepository.readCell(template.id, cell, {
                formula: true,
            });

            const definedNames = await this.excelRepository.listDefinedNames(template.id);
            if (typeof formula === "string" && definedNames.includes(formula)) {
                return removeCharacters(formula);
            }

            return value;
        }
    }

    private formatValue(value: ExcelValue | undefined): string {
        if (value instanceof Date) return value.toISOString();
        return value !== undefined ? String(value) : "";
    }

    private async getDataSourceValues(
        template: Template,
        dataSources: DataSource[]
    ): Promise<DataSourceValue[]> {
        const sheets = await this.excelRepository.getSheets(template.id);

        return _.flatMap(dataSources, dataSource => {
            if (typeof dataSource === "function") {
                return _(sheets)
                    .map(sheet => dataSource(sheet.name))
                    .compact()
                    .value();
            } else {
                return [dataSource];
            }
        });
    }
}

export function parseDate(value: ExcelValue): ExcelValue {
    if (typeof value === "number") {
        const date = XlsxPopulate.numberToDate(value);
        return moment(date).format(dateFormat);
    } else {
        return value;
    }
}
