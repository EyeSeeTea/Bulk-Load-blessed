import _ from "lodash";
import { Id } from "../domain/entities/ReferenceObject";
import { Template } from "../domain/entities/Template";
import { Theme } from "../domain/entities/Theme";
import { StorageRepository } from "../domain/repositories/StorageRepository";
import { TemplateRepository } from "../domain/repositories/TemplateRepository";
import * as templates from "./templates";

const themeCollectionKey = "themes";

export function getTemplates(): Template[] {
    return _.values(templates).map(TemplateClass => {
        return new TemplateClass();
    });
}

export class TemplateWebRepository implements TemplateRepository {
    private templates: Template[];

    constructor(private storage: StorageRepository) {
        this.templates = getTemplates();
    }

    public listTemplates(): Pick<Template, "id" | "name">[] {
        return this.templates.map(({ id, name }) => ({ id, name }));
    }

    public getTemplate(templateId: Id): Template {
        const template = this.templates.find(({ id }) => id === templateId);
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
