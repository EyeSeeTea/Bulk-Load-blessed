import { Card, FormGroup, makeStyles } from "@material-ui/core";
import { ConfirmationDialog } from "d2-ui-components";
import React from "react";
import i18n from "../../../locales";
import ImportPreviewTable from "./ImportPreviewTable";

interface ImportPreviewDialogProps {
    onClose: () => void;
}

export default function ImportPreviewDialog({ onClose }: ImportPreviewDialogProps) {
    const classes = useStyles();

    return (
        <React.Fragment>
            <ConfirmationDialog
                isOpen={true}
                fullWidth={true}
                maxWidth="xl"
                onCancel={onClose}
                cancelText={i18n.t("Close")}
            >
                <Card className={classes.content}>
                    <h3>{i18n.t("Import data")}</h3>

                    <FormGroup className={classes.content} row={true}>
                        <div className={classes.fullWidth}>
                            <ImportPreviewTable />
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
