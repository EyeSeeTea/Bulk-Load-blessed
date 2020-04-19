import { Id } from "./ReferenceObject";
import { ThemeableSections } from "./Theme";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RefType = "row" | "column" | "cell" | "range";
export type SheetRef = RowRef | ColumnRef | CellRef | RangeRef;
export type DataSource = RowDataSource | ColumnDataSource | CellDataSource;

export type StyleSource = {
    section: ThemeableSections;
    source: CellRef | RangeRef;
};

export interface Template {
    id: Id;
    name: string;
    url?: string;
    dataSources: DataSource[];
    styleSources: StyleSource[];
}

export interface GenericSheetRef {
    type: RefType;
    ref: string | number;
    sheet: string | number;
}

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
