import React from "react";
import ThemeListTable from "../../components/theme-list/ThemeListTable";
import { RouteComponentProps } from "../root/RootPage";

export default function ThemesPage({ themes, setThemes }: RouteComponentProps) {
    return <ThemeListTable themes={themes} setThemes={setThemes} />;
}
