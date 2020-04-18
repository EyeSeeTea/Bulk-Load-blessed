import { saveAs } from "file-saver";
import { Id } from "../entities/ReferenceObject";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class DownloadTemplateUseCase {
    constructor(private templateProvider: TemplateRepository) {}

    public async execute(templateId: Id): Promise<void> {
        try {
            const template = await this.templateProvider.getTemplate(templateId);
            const data = await template.toBlob();
            saveAs(data, `${template.name}.xlsx`);
        } catch (error) {
            console.log("Failed building/downloading template");
            throw error;
        }
    }
}
