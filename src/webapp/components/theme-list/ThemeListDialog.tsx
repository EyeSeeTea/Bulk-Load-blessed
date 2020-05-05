import { Card, FormGroup, Icon, IconButton, makeStyles } from "@material-ui/core";
import { ConfirmationDialog } from "d2-ui-components";
import React from "react";
import i18n from "../../../locales";
import ThemeListTable from "./ThemeListTable";

export default function ThemeListDialog() {
    const classes = useStyles();
    const [isOpen, setOpenState] = React.useState(false);

    const close = React.useCallback(() => {
        setOpenState(false);
    }, []);

    return (
        <React.Fragment>
            <div className={classes.button}>
                <IconButton onClick={() => setOpenState(true)} aria-label={i18n.t("Themes")}>
                    <Icon>format_paint</Icon>
                </IconButton>
            </div>

            <ConfirmationDialog
                isOpen={isOpen}
                fullWidth={true}
                maxWidth="xl"
                onCancel={close}
                cancelText={i18n.t("Close")}
            >
                <Card className={classes.content}>
                    <h3>{i18n.t("Themes")}</h3>

                    <FormGroup className={classes.content} row={true}>
                        <div className={classes.fullWidth}>
                            <ThemeListTable />
                        </div>
                    </FormGroup>
                </Card>
            </ConfirmationDialog>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    content: { padding: 30, paddingTop: 0, marginTop: 0, marginBottom: 10 },
    button: { position: "absolute", right: 45, top: 70 },
    fullWidth: { width: "100%" },
});
