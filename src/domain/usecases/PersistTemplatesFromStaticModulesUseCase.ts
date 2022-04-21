import _ from "lodash";
import fs from "fs";
import path from "path";
import { Template } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { getCurrentTimestamp } from "../../utils/time";

export class PersistTemplatesFromStaticModulesUseCase {
    constructor(private templateRepository: TemplateRepository, private usersRepository: UsersRepository) {}

    async execute(): Promise<Template[]> {
        const currentUser = await this.usersRepository.getCurrentUser();
        const customTemplates = this.templateRepository.getCustomTemplates();
        const rootDir = path.join(__dirname, "../../..", "public");

        const templates = customTemplates.map((template): Template => {
            const spreadsheetPath = path.join(rootDir, template.url);
            const buffer = fs.readFileSync(spreadsheetPath);
            const prefix = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,";
            const contents = prefix + buffer.toString("base64");
            const file = { name: path.basename(template.url), contents };
            const date = getCurrentTimestamp();
            const user = _.pick(currentUser, ["id", "username", "name"]);

            return {
                ..._.omit(template, ["url"]),
                file,
                created: { user, timestamp: date },
                lastUpdated: { user, timestamp: date },
            };
        });

        await this.templateRepository.saveTemplates(templates);

        return templates;
    }
}
