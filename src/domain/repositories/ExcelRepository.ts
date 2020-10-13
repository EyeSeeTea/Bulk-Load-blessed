import _ from "lodash";
import { fromBase64 } from "../../utils/files";
import { removeCharacters } from "../../utils/string";
import { promiseMap } from "../../webapp/utils/promises";
import { DataPackage } from "../entities/DataPackage";
import {
    CellRef,
    Range,
    RowDataSource,
    SheetRef,
    Template,
    TeiRowDataSource,
    TrackerEventRowDataSource,
    DataSource,
    DataSourceValue,
    TrackerRelationship,
    GeneratedTemplate,
} from "../entities/Template";
import { Theme, ThemeStyle } from "../entities/Theme";
import dateFormat from "dateformat";
import { getRelationships } from "../entities/TrackedEntityInstance";

export type LoadOptions = WebLoadOptions | FileLoadOptions;

export interface BaseLoadOptions {
    type: "url" | "file";
    url?: string;
    file?: File | Blob;
}

export interface WebLoadOptions extends BaseLoadOptions {
    type: "url";
    url: string;
}

export interface FileLoadOptions extends BaseLoadOptions {
    type: "file";
    file: Blob;
}

export abstract class ExcelRepository {
    public abstract async loadTemplate(template: Template, options: LoadOptions): Promise<void>;
    public abstract async toBlob(template: Template): Promise<Blob>;
    public abstract async toBuffer(template: Template): Promise<Buffer>;
    public abstract async findRelativeCell(
        template: Template,
        location?: SheetRef,
        cell?: CellRef
    ): Promise<CellRef | undefined>;
    public abstract async writeCell(
        template: Template,
        cellRef: CellRef,
        value: string | number | boolean
    ): Promise<void>;
    public abstract async readCell(template: Template, cellRef: CellRef): Promise<string>;
    public abstract async getCellsInRange(template: Template, range: Range): Promise<CellRef[]>;
    public abstract async addPicture(
        template: Template,
        location: SheetRef,
        file: File
    ): Promise<void>;
    public abstract async styleCell(
        template: Template,
        source: SheetRef,
        style: ThemeStyle
    ): Promise<void>;

    abstract getDataSourceValues(
        template: Template,
        dataSources: DataSource[]
    ): Promise<DataSourceValue[]>;

    public async populateTemplate(template: Template, payload: DataPackage): Promise<void> {
        const { dataSources = [] } = template;
        const dataSourceValues = await this.getDataSourceValues(template, dataSources);
        for (const dataSource of dataSourceValues) {
            switch (dataSource.type) {
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

    private async fillTeiRows(
        template: Template,
        dataSource: TeiRowDataSource,
        payload: DataPackage
    ) {
        let { rowStart } = dataSource.attributes;
        if (payload.type !== "trackerPrograms") return;

        for (const trackedEntityInstance of payload.trackedEntityInstances) {
            const { program, orgUnit, id, enrollment } = trackedEntityInstance;

            const cells = await this.getCellsInRange(template, {
                ...dataSource.attributes,
                rowStart,
                rowEnd: rowStart,
            });

            const orgUnitCell = await this.findRelativeCell(template, dataSource.orgUnit, cells[0]);
            if (orgUnitCell && orgUnit) {
                await this.writeCell(template, orgUnitCell, orgUnit.id);
            }

            const teiIdCell = await this.findRelativeCell(template, dataSource.teiId, cells[0]);
            if (teiIdCell && id) {
                await this.writeCell(template, teiIdCell, id);
            }

            const dateCell = await this.findRelativeCell(template, dataSource.date, cells[0]);
            if (dateCell && enrollment)
                await this.writeCell(
                    template,
                    dateCell,
                    dateFormat(new Date(enrollment.date), "yyyy-mm-dd")
                );

            const values = program.attributes.map(
                attribute =>
                    trackedEntityInstance.attributeValues.find(
                        attributeValue => attributeValue.id === attribute.id
                    )?.value
            );

            await Promise.all(
                _(cells)
                    .zip(values)
                    .map(([cell, value]) =>
                        cell && value ? this.writeCell(template, cell, value) : null
                    )
                    .compact()
                    .value()
            );

            rowStart += 1;
        }
    }

    private async fillCell(
        template: GeneratedTemplate,
        cells: CellRef[],
        sheetRef: SheetRef,
        value: string | number | boolean
    ) {
        const cell = await this.findRelativeCell(template, sheetRef, cells[0]);

        if (cell && !_.isNil(value)) {
            await this.writeCell(template, cell, value);
        }
    }

    private async fillTrackerRelationshipRows(
        template: Template,
        dataSource: TrackerRelationship,
        payload: DataPackage
    ) {
        if (payload.type !== "trackerPrograms") return;

        const relationships = getRelationships(payload.trackedEntityInstances);

        let { rowStart } = dataSource.range;

        for (const relationship of relationships) {
            const cells = await this.getCellsInRange(template, {
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
        const cells = await this.getCellsInRange(template, dataSource.range);

        const dataElementIds = cells.map(async cell => {
            const dataElementCell = await this.findRelativeCell(
                template,
                dataSource.dataElement,
                cell
            );

            const dataElementId = dataElementCell
                ? removeCharacters(await this.readCell(template, dataElementCell))
                : undefined;

            return dataElementId;
        });

        const dataElementIdsSet = new Set(await Promise.all(dataElementIds));

        for (const { id, period, dataValues, trackedEntityInstance } of payload.dataEntries) {
            const someDataElementPresentInSheet = _(dataValues).some(dv =>
                dataElementIdsSet.has(dv.dataElement)
            );
            if (!someDataElementPresentInSheet) continue;

            const cells = await this.getCellsInRange(template, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            const teiIdCell = await this.findRelativeCell(template, dataSource.teiId, cells[0]);
            if (teiIdCell && trackedEntityInstance) {
                await this.writeCell(template, teiIdCell, trackedEntityInstance);
            }

            const eventIdCell = await this.findRelativeCell(template, dataSource.eventId, cells[0]);
            if (eventIdCell && id) {
                await this.writeCell(template, eventIdCell, id);
            }

            const periodCell = await this.findRelativeCell(template, dataSource.date, cells[0]);
            if (periodCell) await this.writeCell(template, periodCell, period);

            for (const cell of cells) {
                const dataElementCell = await this.findRelativeCell(
                    template,
                    dataSource.dataElement,
                    cell
                );

                const dataElement = dataElementCell
                    ? removeCharacters(await this.readCell(template, dataElementCell))
                    : undefined;

                const { value } = dataValues.find(dv => dv.dataElement === dataElement) ?? {};

                if (value) await this.writeCell(template, cell, value);
            }

            rowStart += 1;
        }
    }

    private async fillRows(template: Template, dataSource: RowDataSource, payload: DataPackage) {
        let { rowStart } = dataSource.range;

        for (const { id, orgUnit, period, attribute, dataValues } of payload.dataEntries) {
            const cells = await this.getCellsInRange(template, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            const orgUnitCell = await this.findRelativeCell(template, dataSource.orgUnit, cells[0]);
            if (orgUnitCell && orgUnit) {
                await this.writeCell(template, orgUnitCell, orgUnit);
            }

            const eventIdCell = await this.findRelativeCell(template, dataSource.eventId, cells[0]);
            if (eventIdCell && id) {
                await this.writeCell(template, eventIdCell, id);
            }

            const periodCell = await this.findRelativeCell(template, dataSource.period, cells[0]);
            if (periodCell) await this.writeCell(template, periodCell, period);

            const attributeCell = await this.findRelativeCell(
                template,
                dataSource.attribute,
                cells[0]
            );
            if (attributeCell && attribute) {
                await this.writeCell(template, attributeCell, attribute);
            }

            for (const cell of cells) {
                const dataElementCell = await this.findRelativeCell(
                    template,
                    dataSource.dataElement,
                    cell
                );
                const categoryCell = await this.findRelativeCell(
                    template,
                    dataSource.categoryOption,
                    cell
                );

                const dataElement = dataElementCell
                    ? removeCharacters(await this.readCell(template, dataElementCell))
                    : undefined;
                const category = categoryCell
                    ? removeCharacters(await this.readCell(template, categoryCell))
                    : undefined;

                const { value } =
                    dataValues.find(
                        dv => dv.dataElement === dataElement && dv.category === category
                    ) ?? {};

                if (value) await this.writeCell(template, cell, value);
            }

            rowStart += 1;
        }
    }

    public async applyTheme(template: Template, theme: Theme): Promise<void> {
        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source) this.styleCell(template, source, style);
        });

        await promiseMap(_.toPairs(theme.pictures), async ([section, image]) => {
            const file = image ? await fromBase64(image.src) : undefined;
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source && file) this.addPicture(template, source, file);
        });
    }
}
