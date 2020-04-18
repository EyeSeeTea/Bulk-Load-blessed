import { Id } from "../entities/ReferenceObject";
import { Template } from "../entities/Template";

export interface TemplateRepository {
    listTemplates(): Pick<Template, "id" | "name">[];
    getTemplate(id: Id): Promise<Template>;
}
