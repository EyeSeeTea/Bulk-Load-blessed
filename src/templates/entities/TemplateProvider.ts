import { Id } from "./ReferenceObject";
import { Template } from "./Template";

export interface TemplateProvider {
    templates: Template[];
    getTemplate(id: Id): Template;
}
