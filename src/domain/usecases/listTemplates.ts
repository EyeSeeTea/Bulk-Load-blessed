import { CompositionRoot } from "../CompositionRoot";
import { TemplateProvider } from "../repositories/TemplateProvider";

export class ListTemplatesUseCase {
    private templateProvider: TemplateProvider;

    constructor() {
        this.templateProvider = CompositionRoot.getInstance().templateProvider;
    }

    public execute(): { value: string; label: string }[] {
        return this.templateProvider
            .listTemplates()
            .map(({ id, name }) => ({ value: id, label: name }));
    }
}
