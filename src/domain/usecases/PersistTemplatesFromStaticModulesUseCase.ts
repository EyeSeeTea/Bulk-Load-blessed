import _ from "lodash";
import fs from "fs";
import path from "path";
import { Template } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { UsersRepository } from "../repositories/UsersRepository";

export class PersistTemplatesFromStaticModulesUseCase {
    constructor(private templateRepository: TemplateRepository, private usersRepository: UsersRepository) {}

    async execute(): Promise<Template[]> {
        const currentUser = await this.usersRepository.getCurrentUser();
        const customTemplates = this.templateRepository.getCustomTemplates();
        const rootDir = path.join(__dirname, "../../..", "public");

        const templates = customTemplates.map(template => {
            const spreadsheetPath = path.join(rootDir, template.url);
            const buffer = fs.readFileSync(spreadsheetPath);
            const file = { blob: buffer.toString("base64") };
            const date = new Date().toISOString();
            const user = _.pick(currentUser, ["id", "username", "name"]);

            return {
                ...template,
                file,
                created: { user, timestamp: date },
                lastUpdated: { user, timestamp: date },
            };
        });

        await this.templateRepository.saveTemplates(templates);

        return templates;
    }
}
