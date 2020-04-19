import { Template } from "../entities/Template";
import { Theme } from "../entities/Theme";

export interface ExcelRepository {
    toBlob(template: Template): Promise<Blob>;
    applyTheme(template: Template, theme: Theme): Promise<void>;
    reset(template: Template): Promise<void>;
}
