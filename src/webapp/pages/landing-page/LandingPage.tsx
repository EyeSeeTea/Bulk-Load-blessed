import { useSnackbar } from "d2-ui-components";
import React, { useEffect, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme } from "../../../domain/entities/Theme";
import SettingsComponent from "../../components/settings/SettingsDialog";
import ThemeListDialog from "../../components/theme-list/ThemeListDialog";
import { useAppContext } from "../../contexts/api-context";
import Settings from "../../logic/settings";
import DownloadTemplatePage from "../download-template/DownloadTemplatePage";
import ImportTemplatePage from "../import-template/ImportTemplatePage";
import "./LandingPage.css";

export default function LandingPage() {
    const snackbar = useSnackbar();
    const { api } = useAppContext();

    const [settings, setSettings] = useState<Settings>();
    const [themes, setThemes] = useState<Theme[]>([]);

    useEffect(() => {
        Settings.build(api)
            .then(setSettings)
            .catch(err => snackbar.error(`Cannot load settings: ${err.message || err.toString()}`));
    }, [api, snackbar]);

    useEffect(() => {
        CompositionRoot.attach().themes.list.execute().then(setThemes);
    }, []);

    if (!settings) return null;

    return (
        <div className="main-container" style={{ margin: "1em", marginTop: "3em" }}>
            {settings.areSettingsVisibleForCurrentUser() && (
                <React.Fragment>
                    <ThemeListDialog onChange={setThemes} />
                    <SettingsComponent settings={settings} onChange={setSettings} />
                </React.Fragment>
            )}

            <DownloadTemplatePage settings={settings} themes={themes} />
            <ImportTemplatePage settings={settings} />
        </div>
    );
}
