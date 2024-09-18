import { Maybe } from "../../types/utils";
import _ from "lodash";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { DataForm, DataFormType } from "./DataForm";
import { DataPackage } from "./DataPackage";
import { i18nShortCode, Id } from "./ReferenceObject";
import { ImageSections, ThemeableSections } from "./Theme";
import { User, UserTimestamp } from "./User";
import { Sheet as SheetE } from "./Sheet";
import { ModulesRepositories } from "../repositories/ModulesRepositories";

export interface DataFormTemplate extends DataForm {
    templateId: string;
}

export type TemplateType = "generated" | "custom";
export type DataSourceType = "row" | "column" | "cell";
export type RefType = "row" | "column" | "cell" | "range";
export type SheetRef = RowRef | ColumnRef | CellRef | RangeRef;

export type DataSourceValue =
    | RowDataSource
    | TeiRowDataSource
    | TrackerEventRowDataSource
    | TrackerRelationship
    | ColumnDataSource
    | CellDataSource;

// Use to reference data sources for dynamic sheets
type DataSourceValueGetter = (sheet: string) => DataSourceValue | DataSourceValue[] | false;

export type DataSource = DataSourceValue | DataSourceValueGetter;

export type StyleSource = {
    section: ThemeableSections | ImageSections;
    source: CellRef | RangeRef;
};

type Base64String = string;

export interface CustomTemplate extends Omit<CustomTemplateWithUrl, "url"> {
    type: "custom";
    isDefault: boolean;
    file: { name: string; contents: Base64String };
    created: Maybe<UserTimestamp>;
    lastUpdated: Maybe<UserTimestamp>;
    mode?: "basic" | "advanced";
}

export type Template = GeneratedTemplate | CustomTemplate;

interface BaseTemplate {
    type: TemplateType;
    id: Id;
    name: string;
    dataSources?: DataSource[];
    styleSources: StyleSource[];
    dataFormId: CellRef | ValueRef;
    dataFormType: CellRef | ValueRef<DataFormType>;
}

export interface GeneratedTemplate extends BaseTemplate {
    type: "generated";
    rowOffset: number;
    generateMetadata?: boolean;
}

export interface DownloadCustomizationOptions {
    type: DataFormType;
    id: string;
    populate: boolean;
    dataPackage?: DataPackage;
    orgUnits: string[];
    language?: i18nShortCode;
    currentUser: User;
}

export interface ImportCustomizationOptions {
    dataPackage: DataPackage;
}

export interface CustomTemplateWithUrl extends BaseTemplate {
    type: "custom";
    generateMetadata?: boolean;
    url: string;
    description: string;
    fixedOrgUnit?: CellRef;
    fixedPeriod?: CellRef;
    showLanguage?: boolean;
    showPeriod?: boolean;
    downloadCustomization?: (
        excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository,
        modulesRepositories: ModulesRepositories,
        options: DownloadCustomizationOptions
    ) => Promise<void>;
    importCustomization?: (
        excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository,
        options: ImportCustomizationOptions
    ) => Promise<DataPackage | undefined>;
}

export interface GenericSheetRef {
    type: RefType;
    ref: string | number;
    sheet: Sheet;
}

type Sheet = string | number;

export interface RowRef extends GenericSheetRef {
    type: "row";
    ref: number;
}

export interface ColumnRef extends GenericSheetRef {
    type: "column";
    ref: string;
}

export interface CellRef extends GenericSheetRef {
    type: "cell";
    ref: string;
}

export interface RangeRef extends GenericSheetRef {
    type: "range";
    ref: string;
}

export interface ValueRef<T extends string = string> {
    type: "value";
    id: T;
}

export interface Range {
    sheet: Sheet;
    rowStart: number;
    rowEnd?: number;
    columnStart: string;
    columnEnd?: string;
}

interface BaseDataSource {
    type: DataSourceType;
    skipPopulate?: boolean;
    range?: Partial<Range>;
    ref?: CellRef;
    orgUnit: SheetRef | ValueRef;
    period: SheetRef | ValueRef;
    dataElement: SheetRef | ValueRef;
    categoryOption?: SheetRef | ValueRef;
    attribute?: SheetRef | ValueRef;
    eventId?: SheetRef | ValueRef;
    coordinates?: {
        latitude: SheetRef | ValueRef;
        longitude: SheetRef | ValueRef;
    };
}

export interface TrackerRelationship {
    type: "rowTeiRelationship";
    sheetsMatch: string;
    skipPopulate?: boolean;
    range: Range;
    relationshipType: CellRef;
    from: ColumnRef;
    to: ColumnRef;
}

export interface TrackerEventRowDataSource {
    type: "rowTrackedEvent";
    sheetsMatch: string;
    skipPopulate?: boolean;
    teiId: ColumnRef;
    eventId: ColumnRef;
    date: ColumnRef;
    categoryOptionCombo: ColumnRef;
    dataValues: Range;
    programStage: CellRef;
    dataElements: Range;
}

export interface RowDataSource extends BaseDataSource {
    type: "row";
    range: Range;
    orgUnit: ColumnRef | CellRef | ValueRef;
    period: ColumnRef | CellRef | ValueRef;
    dataElement: ColumnRef | RowRef | ValueRef;
    categoryOption?: ColumnRef | RowRef | ValueRef;
    attribute?: ColumnRef | CellRef | ValueRef;
    eventId?: ColumnRef | CellRef | ValueRef;
    coordinates?: {
        latitude: ColumnRef | CellRef | ValueRef;
        longitude: ColumnRef | CellRef | ValueRef;
    };
}

export interface TeiRowDataSource {
    type: "rowTei";
    skipPopulate?: boolean;
    teiId: ColumnRef;
    orgUnit: ColumnRef;
    geometry?: ColumnRef;
    enrollmentDate: ColumnRef;
    incidentDate: ColumnRef;
    enrolledAt?: ColumnRef;
    occurredAt?: ColumnRef;
    attributes: Range;
    attributeId: RowRef;
}

export interface ColumnDataSource extends BaseDataSource {
    type: "column";
    range: Range;
    orgUnit: RowRef | CellRef;
    period: RowRef | CellRef;
    dataElement: ColumnRef;
    categoryOption?: ColumnRef;
    attribute?: RowRef | CellRef;
    eventId?: RowRef | CellRef;
}

export interface CellDataSource extends BaseDataSource {
    type: "cell";
    ref: CellRef;
    orgUnit: CellRef | ValueRef;
    period: CellRef | ValueRef;
    dataElement: CellRef | ValueRef;
    categoryOption?: CellRef | ValueRef;
    attribute?: CellRef | ValueRef;
    eventId?: CellRef | ValueRef;
}

interface DataFormRef {
    type: Maybe<DataFormType>;
    id: Maybe<string>;
}

export function getDataFormRef(template: BaseTemplate): DataFormRef {
    const { dataFormType, dataFormId } = template;

    return {
        type: dataFormType.type === "value" ? dataFormType.id : undefined,
        id: dataFormId.type === "value" ? dataFormId.id : undefined,
    };
}

type ReferenceType = ColumnRef | CellRef | RowRef | Range | ValueRef | undefined;

/* Transform a row data source with a fixed sheet name (ex: "Data Entry") to multiple data sources
   using the existing sheets as reference. Note that this only works when all the references
   in the data source point to the same sheet. Example with a data set with sections "Basic"
   and "Extra", with split tabs enabled:

   - dataSource - Input dataSource using `sheet: "Data Entry"` in its references.
   - sheets- Input sheets with names "Data Entry - Basic" and "Data Entry - Extra".
   - Outputs: two data sources, one with sheet "Data Entry - Basic", the other "Data Entry - Extra".
*/
export function setDataEntrySheet(dataSource: RowDataSource, sheets: SheetE[]): RowDataSource[] {
    const get = <T extends ReferenceType>(ref: T | undefined) =>
        ref && "sheet" in ref ? ref.sheet.toString() : undefined;

    const sheetsFromDataSourceAll = _.compact([
        get(dataSource.orgUnit),
        get(dataSource.period),
        get(dataSource.dataElement),
        get(dataSource.categoryOption),
        get(dataSource.attribute),
        get(dataSource.eventId),
        get(dataSource.coordinates?.latitude),
        get(dataSource.coordinates?.longitude),
    ]);

    const sheetsFromDataSource = _.uniq(sheetsFromDataSourceAll);
    const allSheetNamesEqual = sheetsFromDataSource.length === 1;
    const sheetFromDataSource = sheetsFromDataSourceAll[0];

    if (!allSheetNamesEqual || !sheetFromDataSource) {
        console.warn(`[setDataEntrySheet] Different sheet names used as data source, return unchanged`);
        return [dataSource];
    }

    const sheetNamesFromMapping = _(sheets)
        .map(sheet => sheet.name)
        .groupBy(name => name.split("-")[0]?.trim())
        .get(sheetFromDataSource);

    if (!sheetNamesFromMapping) {
        console.error(`[setDataEntrySheet] Could not map: ${sheetFromDataSource}`);
        return [dataSource];
    }

    return sheetNamesFromMapping.map((sheetName): RowDataSource => {
        const set = <Ref extends ReferenceType>(ref: Ref): Ref =>
            ref && "sheet" in ref ? { ...ref, sheet: sheetName } : ref;

        return {
            type: "row",
            range: set(dataSource.range),
            orgUnit: set(dataSource.orgUnit),
            period: set(dataSource.period),
            dataElement: set(dataSource.dataElement),
            categoryOption: set(dataSource.categoryOption),
            attribute: set(dataSource.attribute),
            eventId: set(dataSource.eventId),
            coordinates: dataSource.coordinates
                ? {
                      latitude: set(dataSource.coordinates.latitude),
                      longitude: set(dataSource.coordinates.longitude),
                  }
                : undefined,
        };
    });
}

export function setSheet<DS extends TrackerRelationship | TrackerEventRowDataSource>(
    dataSource: DS,
    sheetName: string
): DS {
    const sheet = sheetName;

    switch (dataSource.type) {
        case "rowTeiRelationship":
            return {
                ...dataSource,
                range: { ...dataSource.range, sheet },
                relationshipType: { ...dataSource.relationshipType, sheet },
                from: { ...dataSource.from, sheet },
                to: { ...dataSource.to, sheet },
            };
        case "rowTrackedEvent":
            return {
                ...dataSource,
                teiId: { ...dataSource.teiId, sheet },
                eventId: { ...dataSource.eventId, sheet },
                date: { ...dataSource.date, sheet },
                categoryOptionCombo: { ...dataSource.categoryOptionCombo, sheet },
                dataValues: { ...dataSource.dataValues, sheet },
                programStage: { ...dataSource.programStage, sheet },
                dataElements: { ...dataSource.dataElements, sheet },
            };
    }
}

export function getDataSources(template: Template, sheetName: string): DataSourceValue[] {
    return _.flatMap(template.dataSources, dataSource => {
        if (!dataSource) {
            return [];
        } else if (typeof dataSource === "function") {
            return dataSource(sheetName) || [];
        } else {
            return [dataSource];
        }
    });
}
