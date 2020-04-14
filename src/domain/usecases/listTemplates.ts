import { DefaultTemplateProvider } from "../../data/DefaultTemplateProvider";
import { TemplateProvider } from "../repositories/TemplateProvider";

export class ListTemplatesUseCase {
    private templateProvider: TemplateProvider;

    constructor() {
        this.templateProvider = new DefaultTemplateProvider();
    }

    public execute(): { value: string; label: string; type: string }[] {
        return this.templateProvider
            .listTemplates()
            .map(({ id, name, type }) => ({ value: id, label: name, type }));
    }
}
