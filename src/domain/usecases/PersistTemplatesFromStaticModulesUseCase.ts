import { Template } from "../entities/Template";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { UsersRepository } from "../repositories/UsersRepository";

export class PersistTemplatesFromStaticModulesUseCase {
    constructor(private templateRepository: TemplateRepository, private usersRepository: UsersRepository) {}

    async execute(): Promise<Template[]> {
        const currentUser = await this.usersRepository.getCurrentUser();
        const templates = this.templateRepository.getCustomTemplates(currentUser);
        await this.templateRepository.saveTemplates(templates);
        return templates;
    }
}
