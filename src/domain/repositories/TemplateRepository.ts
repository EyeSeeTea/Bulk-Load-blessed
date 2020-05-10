import { Id } from "../entities/ReferenceObject";
import { Template } from "../entities/Template";
import { Theme } from "../entities/Theme";

export interface TemplateRepository {
    // Template access
    listTemplates(): Pick<Template, "id" | "name">[];
    getTemplate(id: Id): Template;
    // Template themes
    listThemes(): Promise<Theme[]>;
    getTheme(id: Id): Promise<Theme>;
    saveTheme(theme: Theme): Promise<void>;
    deleteTheme(id: Id): Promise<void>;
}
