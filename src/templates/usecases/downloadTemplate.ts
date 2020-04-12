import { saveAs } from "file-saver";
import { DefaultTemplateProvider } from "../data/DefaultTemplateProvider";
import { Id } from "../entities/ReferenceObject";
import { TemplateProvider } from "../entities/TemplateProvider";

export class DownloadTemplateUseCase {
    private templateProvider: TemplateProvider;

    constructor(private templateId: Id) {
        this.templateProvider = new DefaultTemplateProvider();
        console.log(this.templateProvider.templates);
    }

    public async execute(): Promise<void> {
        try {
            const template = this.templateProvider.getTemplate(this.templateId);
            await template.loadFromUrl();
            const data = await template.toBlob();
            saveAs(data, `${template.name}.xlsx`);
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
