import dateFormat from "dateformat";
import _ from "lodash";
import { fromBase64 } from "../../utils/files";
import { removeCharacters } from "../../utils/string";
import { promiseMap } from "../../webapp/utils/promises";
import { DataPackage } from "../entities/DataPackage";
import {
    CellDataSource,
    CellRef,
    DataSource,
    DataSourceValue,
    DownloadCustomizationOptions,
    RowDataSource,
    SheetRef,
    TeiRowDataSource,
    Template,
    TrackerEventRowDataSource,
    TrackerRelationship,
    ValueRef,
} from "../entities/Template";
import { Theme, ThemeStyle } from "../entities/Theme";
import { getRelationships } from "../entities/TrackedEntityInstance";
import { ExcelRepository, ExcelValue } from "../repositories/ExcelRepository";
import { InstanceRepository, BuilderMetadata, emptyBuilderMetadata } from "../repositories/InstanceRepository";
import { Relationship } from "../entities/Relationship";

const dateFormatPattern = "yyyy-mm-dd";

export class ExcelBuilder {
    constructor(private excelRepository: ExcelRepository, private instanceRepository: InstanceRepository) {}

    public async populateTemplate(template: Template, payload: DataPackage): Promise<void> {
        const { dataSources = [] } = template;
        const dataSourceValues = await this.getDataSourceValues(template, dataSources);
        const metadata =
            payload.type === "trackerPrograms"
                ? await this.instanceRepository.getBuilderMetadata(payload.trackedEntityInstances)
                : emptyBuilderMetadata;

        for (const dataSource of dataSourceValues) {
            if (!dataSource.skipPopulate) {
                switch (dataSource.type) {
                    case "cell":
                        await this.fillCells(template, dataSource, payload);
                        break;
                    case "row":
                        await this.fillRows(template, dataSource, payload);
                        break;
                    case "rowTei":
                        await this.fillTeiRows(template, dataSource, payload, metadata);
                        break;
                    case "rowTrackedEvent":
                        await this.fillTrackerEventRows(template, dataSource, payload, metadata);
                        break;
                    case "rowTeiRelationship":
                        await this.fillTrackerRelationshipRows(template, dataSource, payload);
                        break;
                    default:
                        throw new Error(`Type ${dataSource.type} not supported`);
                }
            }
        }
    }

    private async getDataSourceValues(template: Template, dataSources: DataSource[]): Promise<DataSourceValue[]> {
        const sheets = await this.excelRepository.getSheets(template.id);

        return _.flatMap(dataSources, dataSource => {
            if (typeof dataSource === "function") {
                return _(sheets)
                    .flatMap(sheet => dataSource(sheet.name))
                    .compact()
                    .value();
            } else {
                return [dataSource];
            }
        });
    }

    private async fillCells(template: Template, dataSource: CellDataSource, payload: DataPackage) {
        const orgUnit = await this.readCellValue(template, dataSource.orgUnit);
        const dataElement = await this.readCellValue(template, dataSource.dataElement);
        const period = await this.readCellValue(template, dataSource.period);
        const categoryOption = await this.readCellValue(template, dataSource.categoryOption);

        const { value } =
            _(payload.dataEntries)
                .filter(dv => dv.orgUnit === orgUnit && dv.period === String(period))
                .flatMap(({ dataValues }) => dataValues)
                .find(dv => dv.dataElement === dataElement && (!dv.category || dv.category === categoryOption)) ?? {};

        if (value) {
            await this.excelRepository.writeCell(template.id, dataSource.ref, value);
        }
    }

    private async readCellValue(template: Template, ref?: CellRef | ValueRef): Promise<ExcelValue> {
        return removeCharacters(await this.excelRepository.readCell(template.id, ref));
    }

    private async fillTeiRows(
        template: Template,
        dataSource: TeiRowDataSource,
        payload: DataPackage,
        metadata: BuilderMetadata
    ) {
        let { rowStart } = dataSource.attributes;
        if (payload.type !== "trackerPrograms") return;

        for (const tei of payload.trackedEntityInstances ?? []) {
            const { orgUnit, id, enrollment } = tei;

            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.attributes,
                rowStart,
                rowEnd: rowStart,
            });

            const orgUnitCell = await this.excelRepository.findRelativeCell(template.id, dataSource.orgUnit, cells[0]);
            if (orgUnitCell && orgUnit) {
                await this.excelRepository.writeCell(
                    template.id,
                    orgUnitCell,
                    metadata.orgUnits[orgUnit.id]?.name ?? ""
                );
            }

            const teiIdCell = await this.excelRepository.findRelativeCell(template.id, dataSource.teiId, cells[0]);
            if (teiIdCell && id) {
                await this.excelRepository.writeCell(template.id, teiIdCell, id);
            }

            const enrollmentDateCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.enrollmentDate,
                cells[0]
            );
            if (enrollmentDateCell && enrollment)
                await this.excelRepository.writeCell(
                    template.id,
                    enrollmentDateCell,
                    dateFormat(new Date(enrollment.enrollmentDate), dateFormatPattern)
                );

            const incidentDateCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.incidentDate,
                cells[0]
            );
            if (incidentDateCell && enrollment)
                await this.excelRepository.writeCell(
                    template.id,
                    incidentDateCell,
                    dateFormat(new Date(enrollment.incidentDate), dateFormatPattern)
                );

            for (const cell of cells) {
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

                const attributeValue = tei.attributeValues.find(av => av.attribute.id === attributeId);

                const value = attributeValue
                    ? (attributeValue.optionId ? metadata.options[attributeValue.optionId]?.name : null) ||
                      attributeValue.value
                    : undefined;

                if (value) {
                    this.excelRepository.writeCell(template.id, cell, value);
                }
            }

            rowStart += 1;
        }
    }

    private async fillCell(template: Template, cellRef: CellRef, sheetRef: SheetRef, value: string | number | boolean) {
        const cell = await this.excelRepository.findRelativeCell(template.id, sheetRef, cellRef);

        if (cell && !_.isNil(value)) {
            await this.excelRepository.writeCell(template.id, cell, value);
        }
    }

    private async fillTrackerRelationshipRows(
        template: Template,
        dataSource: TrackerRelationship,
        payload: DataPackage
    ) {
        if (payload.type !== "trackerPrograms") return;

        const relationships: Relationship[] = getRelationships(payload.trackedEntityInstances ?? []);
        const typeId = removeCharacters(
            await this.excelRepository.readCell(template.id, dataSource.relationshipType, {
                formula: true,
            })
        );

        let { rowStart } = dataSource.range;

        for (const relationship of relationships) {
            if (relationship.typeId !== typeId) continue;

            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            if (cells[0]) {
                await this.fillCell(template, cells[0], dataSource.from, relationship.fromId);
                await this.fillCell(template, cells[0], dataSource.to, relationship.toId);
            }

            rowStart += 1;
        }
    }

    private async fillTrackerEventRows(
        template: Template,
        dataSource: TrackerEventRowDataSource,
        payload: DataPackage,
        metadata: BuilderMetadata
    ) {
        let { rowStart } = dataSource.dataValues;
        const dataElementCells = await this.excelRepository.getCellsInRange(template.id, dataSource.dataElements);

        const dataElementIds = await Promise.all(
            dataElementCells.map(async dataElementCell => {
                return removeCharacters(
                    await this.excelRepository.readCell(template.id, dataElementCell, {
                        formula: true,
                    })
                );
            })
        );

        const dataElementIdsSet = new Set(dataElementIds);

        for (const { id, period, dataValues, trackedEntityInstance, attribute: cocId } of payload.dataEntries) {
            const someDataElementPresentInSheet = _(dataValues).some(dv => dataElementIdsSet.has(dv.dataElement));
            if (!someDataElementPresentInSheet) continue;

            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.dataValues,
                rowStart,
                rowEnd: rowStart,
            });

            const teiIdCell = await this.excelRepository.findRelativeCell(template.id, dataSource.teiId, cells[0]);
            if (teiIdCell && trackedEntityInstance) {
                await this.excelRepository.writeCell(template.id, teiIdCell, trackedEntityInstance);
            }

            const eventIdCell = await this.excelRepository.findRelativeCell(template.id, dataSource.eventId, cells[0]);
            if (eventIdCell && id) {
                await this.excelRepository.writeCell(template.id, eventIdCell, id);
            }

            const cocIdCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.categoryOptionCombo,
                cells[0]
            );
            if (cocIdCell && cocId) {
                await this.excelRepository.writeCell(
                    template.id,
                    cocIdCell,
                    metadata.categoryOptionCombos[cocId]?.name ?? ""
                );
            }

            const dateCell = await this.excelRepository.findRelativeCell(template.id, dataSource.date, cells[0]);
            if (dateCell) await this.excelRepository.writeCell(template.id, dateCell, period);

            for (const [dataElementId, cell] of _.zip(dataElementIds, cells)) {
                if (!dataElementId || !cell) continue;
                const { value } = dataValues.find(dv => dv.dataElement === dataElementId) ?? {};
                if (value) {
                    const value2 = metadata.options[value.toString()]?.name || value;
                    await this.excelRepository.writeCell(template.id, cell, value2);
                }
            }

            rowStart += 1;
        }
    }

    private async fillRows(template: Template, dataSource: RowDataSource, payload: DataPackage) {
        let { rowStart } = dataSource.range;

        for (const { id, orgUnit, period, attribute, dataValues } of payload.dataEntries) {
            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            const orgUnitCell = await this.findRelative(template, dataSource.orgUnit, cells[0]);
            if (orgUnitCell && orgUnit) {
                await this.excelRepository.writeCell(template.id, orgUnitCell, orgUnit);
            }

            const eventIdCell = await this.findRelative(template, dataSource.eventId, cells[0]);
            if (eventIdCell && id) {
                await this.excelRepository.writeCell(template.id, eventIdCell, id);
            }

            const periodCell = await this.findRelative(template, dataSource.period, cells[0]);
            if (periodCell) await this.excelRepository.writeCell(template.id, periodCell, period);

            const attributeCell = await this.findRelative(template, dataSource.attribute, cells[0]);
            if (attributeCell && attribute) {
                await this.excelRepository.writeCell(template.id, attributeCell, attribute);
            }

            for (const cell of cells) {
                const dataElementCell = await this.findRelative(template, dataSource.dataElement, cell);

                const categoryCell = await this.findRelative(template, dataSource.categoryOption, cell);

                const dataElement = dataElementCell
                    ? removeCharacters(await this.excelRepository.readCell(template.id, dataElementCell))
                    : undefined;

                const category = categoryCell
                    ? removeCharacters(await this.excelRepository.readCell(template.id, categoryCell))
                    : undefined;

                const { value } =
                    dataValues.find(
                        dv => dv.dataElement === dataElement && (!dv.category || dv.category === category)
                    ) ?? {};

                if (value) await this.excelRepository.writeCell(template.id, cell, value);
            }

            rowStart += 1;
        }
    }

    private async findRelative(template: Template, ref?: SheetRef | ValueRef, relative?: CellRef) {
        if (ref && ref.type === "value") return undefined;
        return this.excelRepository.findRelativeCell(template.id, ref, relative);
    }

    public async applyTheme(template: Template, theme: Theme): Promise<void> {
        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};

            if (source) {
                const height = (style.text?.split("\n")?.length ?? 1) * (style.fontSize ?? 12) * 2;
                this.excelRepository.styleCell(template.id, source, {
                    ...style,
                    merged: true,
                    rowSize: height,
                    verticalAlignment: "center",
                });
            }
        });

        await promiseMap(_.toPairs(theme.pictures), async ([section, image]) => {
            const file = image ? await fromBase64(image.src) : undefined;
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source && file) this.excelRepository.addPicture(template.id, source, file);
        });
    }

    public async templateCustomization(template: Template, options: DownloadCustomizationOptions): Promise<void> {
        if (template.type === "custom" && template.downloadCustomization) {
            await template.downloadCustomization(this.excelRepository, this.instanceRepository, options);
        }
    }
}
