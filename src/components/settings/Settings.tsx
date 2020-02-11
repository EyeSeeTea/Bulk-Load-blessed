import React from "react";
import _ from "lodash";
import {
    Dialog,
    Card,
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Icon,
} from "@material-ui/core";
import i18n from "../../locales";
import SettingsFields from "./SettingsFields";
import Settings from "../../logic/settings";
import { useSnackbar } from "d2-ui-components";
import { makeStyles } from "@material-ui/styles";

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
    }, [unsavedSettings]);

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

            <Dialog open={isOpen} fullWidth={true} maxWidth="lg" onClose={close}>
                <DialogTitle>{i18n.t("Settings")}</DialogTitle>

                <DialogContent>
                    <Card className={classes.content}>
                        <SettingsFields settings={unsavedSettings} onChange={setUnsavedSettings} />
                    </Card>
                </DialogContent>

                <DialogActions>
                    <Button onClick={close} variant="contained">
                        {i18n.t("Cancel")}
                    </Button>

                    <Button onClick={save} color="primary" variant="contained">
                        {i18n.t("Save")}
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    content: { padding: 30, paddingTop: 0, marginTop: 0, marginBottom: 10 },
    button: { position: "absolute", right: 10, top: 70 },
});
