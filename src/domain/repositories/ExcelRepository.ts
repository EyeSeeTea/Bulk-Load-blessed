import {
    CellRef,
    Range,

    SheetRef,
    Template
} from "../entities/Template";
import { ThemeStyle } from "../entities/Theme";

export type LoadOptions = WebLoadOptions | FileLoadOptions;
export type Value = string | number | boolean | Date;
export type Result = [string, Value]

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
    public abstract async findRelativeCell(
        template: Template,
        location?: SheetRef,
        cell?: CellRef
    ): Promise<CellRef | undefined>;
    public abstract async writeCell(
        template: Template,
        cellRef: CellRef,
        value: Value
    ): Promise<void>;
    public abstract async readCell(
        template: Template,
        cellRef: CellRef
    ): Promise<Value | undefined>;
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
}
