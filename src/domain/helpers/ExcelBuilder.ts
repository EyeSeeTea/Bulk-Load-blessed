import dateFormat from "dateformat";
import _ from "lodash";
import { fromBase64 } from "../../utils/files";
import { removeCharacters } from "../../utils/string";
import { promiseMap } from "../../webapp/utils/promises";
import { DataPackage } from "../entities/DataPackage";
import {
    CellRef,
    DataSource,
    DataSourceValue,
    RowDataSource,
    SheetRef,
    TeiRowDataSource,
    Template,
    TrackerEventRowDataSource,
    TrackerRelationship,
} from "../entities/Template";
import { Theme, ThemeStyle } from "../entities/Theme";
import { getRelationships } from "../entities/TrackedEntityInstance";
import { ExcelRepository } from "../repositories/ExcelRepository";

const dateFormatPattern = "yyyy-mm-dd";

export class ExcelBuilder {
    constructor(private excelRepository: ExcelRepository) {}

    public async populateTemplate(template: Template, payload: DataPackage): Promise<void> {
        const { dataSources = [] } = template;
        const dataSourceValues = await this.getDataSourceValues(template, dataSources);
        for (const dataSource of dataSourceValues) {
            switch (dataSource.type) {
                case "cell":
                    console.log("TODO", { dataSource }); 
                    break;
                case "row":
                    await this.fillRows(template, dataSource, payload);
                    break;
                case "rowTei":
                    await this.fillTeiRows(template, dataSource, payload);
                    break;
                case "rowTrackedEvent":
                    await this.fillTrackerEventRows(template, dataSource, payload);
                    break;
                case "rowTeiRelationship":
                    await this.fillTrackerRelationshipRows(template, dataSource, payload);
                    break;
                default:
                    throw new Error(`Type ${dataSource.type} not supported`);
            }
        }
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
    private async fillTeiRows(
        template: Template,
        dataSource: TeiRowDataSource,
        payload: DataPackage
    ) {
        let { rowStart } = dataSource.attributes;
        if (payload.type !== "trackerPrograms") return;

        for (const tei of payload.trackedEntityInstances ?? []) {
            const { program, orgUnit, id, enrollment } = tei;

            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.attributes,
                rowStart,
                rowEnd: rowStart,
            });

            const orgUnitCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.orgUnit,
                cells[0]
            );
            if (orgUnitCell && orgUnit) {
                await this.excelRepository.writeCell(template.id, orgUnitCell, orgUnit.id);
            }

            const teiIdCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.teiId,
                cells[0]
            );
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

            const values = program.attributes.map(attr => {
                const attributeValue = tei.attributeValues.find(av => av.attribute.id === attr.id);
                return attributeValue ? attributeValue.optionId || attributeValue.value : undefined;
            });

            await Promise.all(
                _(cells)
                    .zip(values)
                    .map(([cell, value]) =>
                        cell && value
                            ? this.excelRepository.writeCell(template.id, cell, value)
                            : null
                    )
                    .compact()
                    .value()
            );

            rowStart += 1;
        }
    }

    private async fillCell(
        template: Template,
        cells: CellRef[],
        sheetRef: SheetRef,
        value: string | number | boolean
    ) {
        const cell = await this.excelRepository.findRelativeCell(template.id, sheetRef, cells[0]);

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

        const relationships = getRelationships(payload.trackedEntityInstances ?? []);

        let { rowStart } = dataSource.range;

        for (const relationship of relationships) {
            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            await this.fillCell(template, cells, dataSource.typeName, relationship.typeName);
            await this.fillCell(template, cells, dataSource.from, relationship.fromId);
            await this.fillCell(template, cells, dataSource.to, relationship.toId);

            rowStart += 1;
        }
    }

    private async fillTrackerEventRows(
        template: Template,
        dataSource: TrackerEventRowDataSource,
        payload: DataPackage
    ) {
        let { rowStart } = dataSource.range;
        const cells = await this.excelRepository.getCellsInRange(template.id, dataSource.range);

        const dataElementIds = cells.map(async cell => {
            const dataElementCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.dataElement,
                cell
            );

            const dataElementId = dataElementCell
                ? removeCharacters(
                      await this.excelRepository.readCell(template.id, dataElementCell)
                  )
                : undefined;

            return dataElementId;
        });

        const dataElementIdsSet = new Set(await Promise.all(dataElementIds));

        for (const {
            id,
            period,
            dataValues,
            trackedEntityInstance,
            attribute: aocId,
        } of payload.dataEntries) {
            const someDataElementPresentInSheet = _(dataValues).some(dv =>
                dataElementIdsSet.has(dv.dataElement)
            );
            if (!someDataElementPresentInSheet) continue;

            const cells = await this.excelRepository.getCellsInRange(template.id, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            const teiIdCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.teiId,
                cells[0]
            );
            if (teiIdCell && trackedEntityInstance) {
                await this.excelRepository.writeCell(template.id, teiIdCell, trackedEntityInstance);
            }

            const eventIdCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.eventId,
                cells[0]
            );
            if (eventIdCell && id) {
                await this.excelRepository.writeCell(template.id, eventIdCell, id);
            }

            const aocIdCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.attributeOptionCombo,
                cells[0]
            );
            if (aocIdCell && aocId) {
                await this.excelRepository.writeCell(template.id, aocIdCell, aocId);
            }

            const dateCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.date,
                cells[0]
            );
            if (dateCell) await this.excelRepository.writeCell(template.id, dateCell, period);

            for (const cell of cells) {
                const dataElementCell = await this.excelRepository.findRelativeCell(
                    template.id,
                    dataSource.dataElement,
                    cell
                );

                const dataElement = dataElementCell
                    ? removeCharacters(
                          await this.excelRepository.readCell(template.id, dataElementCell)
                      )
                    : undefined;

                const { value } = dataValues.find(dv => dv.dataElement === dataElement) ?? {};

                if (value) await this.excelRepository.writeCell(template.id, cell, value);
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

            const orgUnitCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.orgUnit,
                cells[0]
            );
            if (orgUnitCell && orgUnit) {
                await this.excelRepository.writeCell(template.id, orgUnitCell, orgUnit);
            }

            const eventIdCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.eventId,
                cells[0]
            );
            if (eventIdCell && id) {
                await this.excelRepository.writeCell(template.id, eventIdCell, id);
            }

            const periodCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.period,
                cells[0]
            );
            if (periodCell) await this.excelRepository.writeCell(template.id, periodCell, period);

            const attributeCell = await this.excelRepository.findRelativeCell(
                template.id,
                dataSource.attribute,
                cells[0]
            );
            if (attributeCell && attribute) {
                await this.excelRepository.writeCell(template.id, attributeCell, attribute);
            }

            for (const cell of cells) {
                const dataElementCell = await this.excelRepository.findRelativeCell(
                    template.id,
                    dataSource.dataElement,
                    cell
                );
                const categoryCell = await this.excelRepository.findRelativeCell(
                    template.id,
                    dataSource.categoryOption,
                    cell
                );

                const dataElement = dataElementCell
                    ? removeCharacters(
                          await this.excelRepository.readCell(template.id, dataElementCell)
                      )
                    : undefined;
                const category = categoryCell
                    ? removeCharacters(
                          await this.excelRepository.readCell(template.id, categoryCell)
                      )
                    : undefined;

                const { value } =
                    dataValues.find(
                        dv => dv.dataElement === dataElement && dv.category === category
                    ) ?? {};

                if (value) await this.excelRepository.writeCell(template.id, cell, value);
            }

            rowStart += 1;
        }
    }

    public async applyTheme(template: Template, theme: Theme): Promise<void> {
        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source) this.excelRepository.styleCell(template.id, source, style);
        });

        await promiseMap(_.toPairs(theme.pictures), async ([section, image]) => {
            const file = image ? await fromBase64(image.src) : undefined;
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source && file) this.excelRepository.addPicture(template.id, source, file);
        });
    }
}
