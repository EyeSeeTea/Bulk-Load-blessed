import { Id } from "../entities/ReferenceObject";
import { Template } from "../entities/Template";
import { TemplateProvider } from "../entities/TemplateProvider";

export function getTemplates(): Template[] {
    const tasks = require.context("./custom-templates", false, /.*\.ts$/);
    return tasks.keys().map(key => {
        const TemplateClass = tasks(key).default;
        return new TemplateClass();
    });
}

export class DefaultTemplateProvider implements TemplateProvider {
    public readonly templates: Template[];

    constructor() {
        this.templates = getTemplates();
    }

    getTemplate(templateId: Id): Template {
        const template = this.templates.find(({ id }) => id === templateId);
        if (!template) throw new Error("Attempt to read from an invalid template");

        return template;
    }
}
