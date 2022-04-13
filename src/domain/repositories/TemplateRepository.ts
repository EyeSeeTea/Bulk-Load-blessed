import { Id } from "../entities/ReferenceObject";
import { CustomTemplateWithUrl, Template } from "../entities/Template";
import { Theme } from "../entities/Theme";

export interface TemplateRepository {
    // Template access
    getTemplates(): Promise<Template[]>;
    getCustomTemplates(): CustomTemplateWithUrl[];
    saveTemplate(template: Template): Promise<void>;
    saveTemplates(templates: Template[]): Promise<void>;
    getTemplate(id: Id): Promise<Template>;
    deleteTemplate(id: Id): Promise<void>;
    // Template themes
    listThemes(): Promise<Theme[]>;
    getTheme(id: Id): Promise<Theme>;
    saveTheme(theme: Theme): Promise<void>;
    deleteTheme(id: Id): Promise<void>;
}
