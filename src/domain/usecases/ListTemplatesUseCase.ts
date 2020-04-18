import { CompositionRoot } from "../../CompositionRoot";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class ListTemplatesUseCase {
    private templateProvider: TemplateRepository;

    constructor() {
        this.templateProvider = CompositionRoot.getInstance().templateProvider;
    }

    public execute(): { value: string; label: string }[] {
        return this.templateProvider
            .listTemplates()
            .map(({ id, name }) => ({ value: id, label: name }));
    }
}
