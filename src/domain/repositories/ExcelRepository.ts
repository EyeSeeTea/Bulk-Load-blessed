import { Template } from "../entities/Template";
import { Theme } from "../entities/Theme";

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

export interface ExcelRepository {
    loadTemplate(template: Template, options: LoadOptions): Promise<void>;
    applyTheme(template: Template, theme: Theme): Promise<void>;
    toBlob(template: Template): Promise<Blob>;
}
