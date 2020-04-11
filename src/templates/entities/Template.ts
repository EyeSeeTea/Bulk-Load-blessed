import { AggregatedPackage } from "./AggregatedPackage";
import { EventsPackage } from "./EventsPackage";
import { Id } from "./ReferenceObject";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RefType = "row" | "column" | "cell";
export type SheetRef = RowRef | ColumnRef | CellRef;
export type DataSource = RowDataSource | ColumnDataSource | CellDataSource;

export type TemplateType = "dataSet" | "program";
export type Template = DataSetTemplate | ProgramTemplate;

export interface GenericTemplate {
    id: Id;
    name: string;
    type: TemplateType;
    dataSources: DataSource[];
    write(): Blob;
    read(file: File): AggregatedPackage | EventsPackage;
}

export interface DataSetTemplate extends GenericTemplate {
    type: "dataSet";
    read(file: File): AggregatedPackage;
}

export interface ProgramTemplate extends GenericTemplate {
    type: "program";
    read(file: File): EventsPackage;
}

export interface GenericSheetRef {
    type: RefType;
    ref: string | number;
}

export interface RowRef extends GenericSheetRef {
    type: "cell";
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

export interface Range {
    rowStart: number;
    rowEnd: number;
    columnStart: string;
    columnEnd: string;
}

export interface GenericDataSource {
    type: RefType;
    range: Partial<Range>;
    orgUnit: SheetRef;
    period: SheetRef;
    dataElement: SheetRef | Id;
    categoryOption?: SheetRef | Id;
}

export interface RowDataSource extends GenericDataSource {
    type: "row";
    range: PartialBy<Range, "rowEnd">;
    orgUnit: ColumnRef | CellRef;
    period: ColumnRef | CellRef;
    dataElement: RowRef;
    categoryOption?: RowRef;
}

export interface ColumnDataSource extends GenericDataSource {
    type: "column";
    range: PartialBy<Range, "columnEnd">;
    orgUnit: RowRef | CellRef;
    period: RowRef | CellRef;
    dataElement: ColumnRef;
    categoryOption?: ColumnRef;
}

export interface CellDataSource extends GenericDataSource {
    type: "cell";
    ref: CellRef;
    orgUnit: CellRef;
    period: CellRef;
    dataElement: CellRef | Id;
    categoryOption?: CellRef | Id;
}
