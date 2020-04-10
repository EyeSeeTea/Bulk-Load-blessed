import { AggregatedPackage } from "../entities/AggregatedPackage";
import { EventsPackage } from "../entities/EventsPackage";
import { Id } from "../entities/ReferenceObject";
import { Template } from "../entities/Template";
import { TemplateProvider } from "../entities/TemplateProvider";

export function getTemplates(): Template[] {
    const tasks = require.context("./custom-templates", false, /.*\.ts$/);
    return tasks.keys().map(key => tasks(key).default);
}

export class DefaultTemplateProvider implements TemplateProvider {
    public readonly templates: Template[];

    constructor() {
        this.templates = getTemplates();
    }

    downloadTemplate(templateId: Id): void {
        const template = this.templates.find(({ id }) => id === templateId);
        if (!template) throw new Error("Attempt to read from an invalid template");

        template.write();
    }

    uploadTemplate(templateId: Id, file: File): AggregatedPackage | EventsPackage {
        const template = this.templates.find(({ id }) => id === templateId);
        if (!template) throw new Error("Attempt to read from an invalid template");

        return template.read(file);
    }
}
