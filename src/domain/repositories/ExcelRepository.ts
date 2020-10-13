import { CellRef, Range, SheetRef } from "../entities/Template";
import { ThemeStyle } from "../entities/Theme";

export type LoadOptions = WebLoadOptions | FileLoadOptions;
export type Value = string | number | boolean | Date;
export type Result = [string, Value];

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
    public abstract async loadTemplate(options: LoadOptions): Promise<string>;
    public abstract async toBlob(id: string): Promise<Blob>;
    public abstract async findRelativeCell(
        id: string,
        location?: SheetRef,
        cell?: CellRef
    ): Promise<CellRef | undefined>;
    public abstract async writeCell(id: string, cellRef: CellRef, value: Value): Promise<void>;
    public abstract async readCell(id: string, cellRef: CellRef): Promise<Value | undefined>;
    public abstract async getCellsInRange(id: string, range: Range): Promise<CellRef[]>;
    public abstract async addPicture(id: string, location: SheetRef, file: File): Promise<void>;
    public abstract async styleCell(id: string, source: SheetRef, style: ThemeStyle): Promise<void>;
}
