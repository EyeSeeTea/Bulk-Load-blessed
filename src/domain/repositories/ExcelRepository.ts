import { Sheet } from "../entities/Sheet";
import { CellRef, Range, SheetRef, ValueRef } from "../entities/Template";
import { ThemeStyle } from "../entities/Theme";

export type LoadOptions = WebLoadOptions | FileLoadOptions;
export type ExcelValue = string | number | boolean | Date;
export type Result = [string, ExcelValue];

export interface BaseLoadOptions {
    type: "url" | "file";
    url?: string;
    file?: File | Blob;
}

export interface ReadCellOptions {
    formula?: boolean;
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
    public abstract async toBuffer(id: string): Promise<Buffer>;
    public abstract async findRelativeCell(
        id: string,
        location?: SheetRef,
        cell?: CellRef
    ): Promise<CellRef | undefined>;
    public abstract async writeCell(id: string, cellRef: CellRef, value: ExcelValue): Promise<void>;
    public abstract async readCell(
        id: string,
        cellRef?: CellRef | ValueRef,
        options?: ReadCellOptions
    ): Promise<ExcelValue | undefined>;
    public abstract async getCellsInRange(id: string, range: Range): Promise<CellRef[]>;
    public abstract async addPicture(id: string, location: SheetRef, file: File): Promise<void>;
    public abstract async styleCell(id: string, source: SheetRef, style: ThemeStyle): Promise<void>;
    public abstract async getSheets(id: string): Promise<Sheet[]>;
    public abstract async getConstants(id: string): Promise<Record<string, string>>;
    public abstract async getSheetRowsCount(
        id: string,
        sheetId: string | number
    ): Promise<number | undefined>;
    public abstract async listDefinedNames(id: string): Promise<string[]>;
}
