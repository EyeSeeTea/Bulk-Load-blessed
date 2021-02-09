import { RouteComponentProps } from "../root/RootPage";
import i18n from "../../../locales";
import { makeStyles, DialogContentText } from "@material-ui/core";
import React from "react";

export default function BlankTemplatePage({ settings }: RouteComponentProps) {
    const classes = useStyles();
    console.log(settings);

    return (
        <React.Fragment>
            <h2 className={classes.title}>{i18n.t("User with no permissions")} </h2>
            <DialogContentText>
                {i18n.t(
                    "It seems this user account does not have any permission." +
                        " Please get in touch with the admin if you need access to these sections."
                )}
            </DialogContentText>
        </React.Fragment>
    );
}
const useStyles = makeStyles({
    fullWidth: { width: "100%" },
    content: { margin: "1rem", marginBottom: 35, marginLeft: 0 },
    checkbox: { padding: 9 },
    title: { marginTop: 0 },
    eventDateTime: { marginBottom: 15 },
    duplicateTolerance: { margin: 0, marginRight: 15, width: 35 },
    duplicateToleranceLabel: { margin: 0, marginRight: 15, alignSelf: "center" },
});
