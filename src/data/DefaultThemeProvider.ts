import { Id } from "../domain/entities/ReferenceObject";
import { Theme } from "../domain/entities/Theme";
import { AppStorage } from "../domain/repositories/AppStorage";
import { ThemeProvider } from "../domain/repositories/ThemeProvider";

export class DefaultThemeProvider implements ThemeProvider {
    constructor(private appStorage: AppStorage) {}

    public listThemes(): Theme[] {
        return [];
    }

    public async getTheme(templateId: Id): Promise<Theme> {
        throw new Error("Method not implemented")
    }
}
