import { Card, Icon, IconButton, makeStyles } from "@material-ui/core";
import { ConfirmationDialog, useSnackbar } from "d2-ui-components";
import React from "react";
import i18n from "../../../locales";
import Settings from "../../logic/settings";
import SettingsFields from "./SettingsFields";

export interface SettingsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

export default function SettingsComponent(props: SettingsProps) {
    const { settings, onChange } = props;
    const classes = useStyles();
    const snackbar = useSnackbar();
    const [isOpen, setOpenState] = React.useState(false);
    const [unsavedSettings, setUnsavedSettings] = React.useState(settings);

    const save = React.useCallback(async () => {
        const result = await unsavedSettings.save();

        if (result.status) {
            setOpenState(false);
            onChange(unsavedSettings);
            snackbar.success(i18n.t("Settings saved"));
        } else {
            snackbar.error(result.error);
        }
    }, [unsavedSettings, onChange, snackbar]);

    const close = React.useCallback(() => {
        setOpenState(false);
        setUnsavedSettings(settings);
    }, [settings]);

    const isComponentVisible = React.useMemo(() => {
        return settings.areSettingsVisibleForCurrentUser();
    }, [settings]);

    if (!isComponentVisible) return null;

    return (
        <React.Fragment>
            <div className={classes.button}>
                <IconButton onClick={() => setOpenState(true)} aria-label={i18n.t("Settings")}>
                    <Icon>settings</Icon>
                </IconButton>
            </div>

            <ConfirmationDialog
                isOpen={isOpen}
                fullWidth={true}
                maxWidth="xl"
                onCancel={close}
                onSave={save}
            >
                <Card className={classes.content}>
                    <SettingsFields settings={unsavedSettings} onChange={setUnsavedSettings} />
                </Card>
            </ConfirmationDialog>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    content: { padding: 30, paddingTop: 0, marginTop: 0, marginBottom: 10 },
    button: { position: "absolute", right: 10, top: 70 },
});
