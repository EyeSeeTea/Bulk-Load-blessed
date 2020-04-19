import { Id } from "../domain/entities/ReferenceObject";
import { Template } from "../domain/entities/Template";
import { TemplateRepository } from "../domain/repositories/TemplateRepository";

export function getTemplates(): Template[] {
    const tasks = require.context("./custom-templates", false, /.*\.ts$/);
    return tasks.keys().map(key => {
        const TemplateClass = tasks(key).default;
        return new TemplateClass();
    });
}

export class TemplateWebRepository implements TemplateRepository {
    private templates: Template[];

    constructor() {
        this.templates = getTemplates();
    }

    public listTemplates(): Pick<Template, "id" | "name">[] {
        return this.templates.map(({ id, name }) => ({ id, name }));
    }

    public async getTemplate(templateId: Id): Promise<Template> {
        const template = this.templates.find(({ id }) => id === templateId);
        if (!template) throw new Error("Attempt to read from an invalid template");
        else return template;
    }
}
