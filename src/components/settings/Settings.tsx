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
import { useAppContext } from "../../contexts/api-context";
import { useSnackbar } from "d2-ui-components";
import { makeStyles } from "@material-ui/styles";

export interface SettingsProps {}

type LoaderState<Data> =
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "loaded"; data: Data };

function useLoader<Data>() {
    const [state, setState] = React.useState<LoaderState<Data>>({ type: "loading" } as const);

    return React.useMemo(() => {
        return {
            state: state,
            setData(data: Data) {
                setState({ type: "loaded", data });
            },
            setError(error: any) {
                setState({
                    type: "error",
                    message: error ? error.message || error.toString() : "",
                });
            },
        };
    }, [state, setState]);
}

export default function SettingsComponent(_props: SettingsProps) {
    const { api } = useAppContext();
    const classes = useStyles();
    const snackbar = useSnackbar();
    const [isOpen, setOpenState] = React.useState(false);
    const settingsLoader = useLoader<Settings>();

    async function save() {
        if (settingsLoader.state.type === "loaded") {
            const response = await settingsLoader.state.data.save();
            if (response.status === "OK") {
                snackbar.success("Settings saved");
                setOpenState(false);
            } else {
                snackbar.error(JSON.stringify(response.typeReports));
            }
        }
    }

    React.useEffect(() => {
        Settings.build(api)
            .then(settingsLoader.setData)
            .catch(settingsLoader.setError);
    }, []);

    return (
        <React.Fragment>
            <div className={classes.button}>
                <IconButton onClick={() => setOpenState(true)} aria-label={i18n.t("Settings")}>
                    <Icon>settings</Icon>
                </IconButton>
            </div>

            <Dialog
                open={isOpen}
                fullWidth={true}
                maxWidth="md"
                onClose={() => setOpenState(false)}
            >
                <DialogTitle>{i18n.t("Settings")}</DialogTitle>

                <DialogContent>
                    <Card className={classes.content}>
                        {settingsLoader.state.type === "loading" && i18n.t("Loading...")}

                        {settingsLoader.state.type === "error" && (
                            <div>
                                {i18n.t("Error")}: {settingsLoader.state.message}
                            </div>
                        )}

                        {settingsLoader.state.type === "loaded" && (
                            <SettingsFields
                                settings={settingsLoader.state.data}
                                onChange={settingsLoader.setData}
                            />
                        )}
                    </Card>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenState(false)} variant="contained">
                        {i18n.t("Cancel")}
                    </Button>

                    <Button onClick={() => save()} color="primary" variant="contained">
                        {i18n.t("Save")}
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    content: { padding: 10, margin: 10 },
    button: { position: "absolute", right: 10, top: 70 },
});
