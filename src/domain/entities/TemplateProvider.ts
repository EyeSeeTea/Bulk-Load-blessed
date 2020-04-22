import { Id } from "./ReferenceObject";
import { Template } from "./Template";

export interface TemplateProvider {
    templates: Template[];
    listTemplates(): Pick<Template, "id" | "name" | "type">[];
    getTemplate(id: Id): Promise<Template>;
}
