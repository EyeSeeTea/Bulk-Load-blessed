import _ from "lodash";
import { CustomTemplate } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class GetCustomTemplatesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    async execute(): Promise<CustomTemplate[]> {
        const templates = await this.templateRepository.getTemplates();
        // TODO: test force
        const templates2 = templates.map(t =>
            t.id === "NRCmodule_v1" ? { ...t, dataFormId: { type: "cell" as const, sheet: 0, ref: "B1" } } : t
        );

        return _(templates)
            .map(template => (template.type === "custom" ? template : null))
            .compact()
            .value();
    }
}
