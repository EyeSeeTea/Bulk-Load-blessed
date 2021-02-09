import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useCallback } from "react";
import i18n from "../../../locales";
import SettingsFields, { SettingsFieldsProps } from "../../components/settings/SettingsFields";
import { useAppContext } from "../../contexts/app-context";
import { RouteComponentProps } from "../root/RootPage";

export default function SettingsPage({ settings, setSettings }: RouteComponentProps) {
    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();

    const save = useCallback<SettingsFieldsProps["onChange"]>(
        async newSettings => {
            const res = await newSettings.save(compositionRoot);

            if (!res.status) {
                snackbar.error(res.error);
            } else {
                setSettings(newSettings);
                snackbar.success(i18n.t("Settings saved"));
            }
        },
        [setSettings, snackbar, compositionRoot]
    );

    return <SettingsFields settings={settings} onChange={save} />;
}
