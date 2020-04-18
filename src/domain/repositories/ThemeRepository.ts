import { Id } from "../entities/ReferenceObject";
import { Theme } from "../entities/Theme";

export interface ThemeRepository {
    listThemes(): Theme[];
    getTheme(id: Id): Promise<Theme>;
}
