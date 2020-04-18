import { Id } from "../domain/entities/ReferenceObject";
import { Theme } from "../domain/entities/Theme";
import { StorageRepository } from "../domain/repositories/StorageRepository";
import { ThemeRepository } from "../domain/repositories/ThemeRepository";

export class ThemeWebRepository implements ThemeRepository {
    constructor(private appStorage: StorageRepository) {}

    public listThemes(): Theme[] {
        return [];
    }

    public async getTheme(templateId: Id): Promise<Theme> {
        throw new Error("Method not implemented");
    }
}
