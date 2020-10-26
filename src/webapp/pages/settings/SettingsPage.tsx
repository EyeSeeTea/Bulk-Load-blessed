import { useSnackbar } from "d2-ui-components";
import React, { useCallback } from "react";
import i18n from "../../../locales";
import SettingsFields from "../../components/settings/SettingsFields";
import { RouteComponentProps } from "../root/RootPage";

export default function SettingsPage({ settings, setSettings }: RouteComponentProps) {
    const snackbar = useSnackbar();

    const save = useCallback(
        async newSettings => {
            const { error } = await newSettings.save();

            if (error) {
                snackbar.error(error);
            } else {
                setSettings(newSettings);
                snackbar.success(i18n.t("Settings saved"));
            }
        },
        [setSettings, snackbar]
    );

    return <SettingsFields settings={settings} onChange={save} />;
}
