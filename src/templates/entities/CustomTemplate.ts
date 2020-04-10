import { Template } from "./Template";
import { Id } from "./ReferenceObject";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RefType = "row" | "column" | "cell";

export type RowRef = {
    type: "cell";
    ref: number;
};
export type ColumnRef = {
    type: "column";
    ref: string;
};

export type CellRef = {
    type: "cell";
    ref: string;
};

export type SheetRef = RowRef | ColumnRef | CellRef;

export interface Range {
    rowStart: number;
    rowEnd: number;
    columnStart: string;
    columnEnd: string;
}

export interface RowDataSource {
    type: "row";
    range: PartialBy<Range, "rowEnd">;
    orgUnit: ColumnRef | CellRef;
    period: ColumnRef | CellRef;
    dataElement: RowRef;
    categoryOption?: RowRef;
}

export interface ColumnDataSource {
    type: "column";
    range: PartialBy<Range, "columnEnd">;
    orgUnit: RowRef | CellRef;
    period: RowRef | CellRef;
    dataElement: ColumnRef;
    categoryOption?: ColumnRef;
}

export interface CellDataSource {
    type: "cell";
    ref: CellRef;
    orgUnit: CellRef;
    period: CellRef;
    dataElement: CellRef | Id;
    categoryOption?: CellRef | Id;
}

export type DataSource = RowDataSource | ColumnDataSource | CellDataSource;

export interface CustomTemplate extends Template {
    dataSources: DataSource[];
}
