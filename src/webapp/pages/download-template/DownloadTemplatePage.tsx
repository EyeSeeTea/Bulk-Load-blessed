import { Button, makeStyles } from "@material-ui/core";
import { useLoading, useSnackbar } from "d2-ui-components";
import React, { useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import i18n from "../../../locales";
import {
    TemplateSelector,
    TemplateSelectorState,
} from "../../components/template-selector/TemplateSelector";
import { useAppContext } from "../../contexts/api-context";
import { RouteComponentProps } from "../root/RootPage";

export default function DownloadTemplatePage({ settings, themes }: RouteComponentProps) {
    const loading = useLoading();
    const snackbar = useSnackbar();
    const classes = useStyles();
    const { api } = useAppContext();

    const [template, setTemplate] = useState<TemplateSelectorState | null>(null);

    const handleTemplateDownloadClick = async () => {
        if (!template) {
            snackbar.info(i18n.t("You need to select at least one element to export"));
            return;
        }

        const {
            type,
            startDate,
            endDate,
            populate,
            populateStartDate,
            populateEndDate,
            templateType,
            orgUnits,
        } = template;

        if (type === "dataSets" && (!startDate || !endDate)) {
            snackbar.info(i18n.t("You need to select start and end periods for dataSet templates"));
            return;
        }

        if (templateType === "custom" && !!orgUnits) {
            template.populate = true;
            template.populateStartDate = template.startDate;
            template.populateEndDate = template.endDate;
        } else if (populate && (!populateStartDate || !populateEndDate)) {
            snackbar.info(i18n.t("You need to select start and end dates to populate template"));
            return;
        }

        loading.show(true, i18n.t("Downloading template..."));
        await CompositionRoot.attach().templates.download(api, template);
        loading.show(false);
    };

    return (
        <React.Fragment>
            <TemplateSelector settings={settings} themes={themes} onChange={setTemplate} />

            <div className={classes.downloadTemplateRow}>
                <Button variant="contained" color="primary" onClick={handleTemplateDownloadClick}>
                    {i18n.t("Download template")}
                </Button>
            </div>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    downloadTemplateRow: {
        marginTop: "2em",
        marginLeft: "2em",
        marginRight: "2em",
        textAlign: "center",
        display: "flex",
        flexFlow: "row nowrap",
        justifyContent: "space-around",
    },
    content: { margin: "1rem", marginBottom: 35, marginLeft: 0 },
    checkbox: { padding: 9 },
});
