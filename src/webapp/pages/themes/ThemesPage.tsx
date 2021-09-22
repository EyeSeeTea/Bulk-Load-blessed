import ThemeListTable from "../../components/theme-list/ThemeListTable";
import { RouteComponentProps } from "../Router";

export default function ThemesPage({ themes, setThemes }: RouteComponentProps) {
    return <ThemeListTable themes={themes} setThemes={setThemes} />;
}
