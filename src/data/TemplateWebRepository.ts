import _ from "lodash";
import path from "path";
import fs from "fs";
import { Id } from "../domain/entities/ReferenceObject";
import { Template } from "../domain/entities/Template";
import { Theme } from "../domain/entities/Theme";
import { StorageRepository } from "../domain/repositories/StorageRepository";
import { TemplateRepository } from "../domain/repositories/TemplateRepository";
import { cache } from "../utils/cache";
import * as templates from "./templates";
import * as customTemplates from "./templates/custom-templates";

const themeCollectionKey = "themes";

export class TemplateWebRepository implements TemplateRepository {
    constructor(private storage: StorageRepository) {}

    @cache()
    private async getTemplates(): Promise<Template[]> {
        const customTemplates = await this.storage.getObject<Template[]>("templates", []);
        const genericTemplates = _.values(templates).map(TemplateClass => new TemplateClass());
        return _.concat(genericTemplates, customTemplates);
    }

    public getCustomTemplates(): Template[] {
        const rootDir = path.join(__dirname, "../..", "public");

        return _.values(customTemplates).map((TemplateClass): Template => {
            const template = new TemplateClass();
            const spreadsheetPath = path.join(rootDir, template.url);
            const buffer = fs.readFileSync(spreadsheetPath);
            const file = { blob: buffer.toString("base64") };
            return { ...template, file };
        });
    }

    public saveTemplates(templates: Template[]): Promise<void> {
        return this.storage.saveObject("templates", templates);
    }

    public async getTemplate(templateId: Id): Promise<Template> {
        const templates = await this.getTemplates();
        const template = templates.find(({ id }) => id === templateId);
        if (!template) throw new Error(`Attempt to read from invalid template ${templateId}`);
        return template;
    }

    public async listThemes(): Promise<Theme[]> {
        const objects = await this.storage.listObjectsInCollection(themeCollectionKey);
        return objects.map(data => new Theme(data));
    }

    public async getTheme(themeId: string): Promise<Theme> {
        const data = await this.storage.getObjectInCollection(themeCollectionKey, themeId);
        return new Theme(data);
    }

    public async saveTheme(theme: Theme): Promise<void> {
        await this.storage.saveObjectInCollection<Theme>(themeCollectionKey, theme);
    }

    public async deleteTheme(id: string): Promise<void> {
        await this.storage.removeObjectInCollection(themeCollectionKey, id);
    }
}
