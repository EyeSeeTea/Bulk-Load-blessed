import { TemplateRepository } from "../repositories/TemplateRepository";

export class ListTemplatesUseCase {
    constructor(private templateRepository: TemplateRepository) {}

    public execute(): { value: string; label: string }[] {
        return this.templateRepository
            .listTemplates()
            .map(({ id, name }) => ({ value: id, label: name }));
    }
}
