import { Button, Paper } from "@material-ui/core";
import { useLoading, useSnackbar } from "d2-ui-components";
import React, { useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import {
    TemplateSelector,
    TemplateSelectorState,
} from "../../components/template-selector/TemplateSelector";
import { useAppContext } from "../../contexts/api-context";
import Settings from "../../logic/settings";

interface DownloadTemplatePageProps {
    settings: Settings;
    themes: Theme[];
}

export default function DownloadTemplatePage({ settings, themes }: DownloadTemplatePageProps) {
    const loading = useLoading();
    const snackbar = useSnackbar();
    const { api } = useAppContext();

    const [template, setTemplate] = useState<TemplateSelectorState | null>(null);

    const handleTemplateDownloadClick = async () => {
        if (!template) {
            snackbar.info(i18n.t("You need to select at least one element to export"));
            return;
        }

        const { type, orgUnits = [], populate, startDate, endDate, ...rest } = template;

        if (type === "dataSets" && (!startDate || !endDate)) {
            snackbar.info(i18n.t("You need to select start and end dates for dataSet templates"));
            return;
        }

        loading.show(true);

        const showOrgUnitsOnGeneration = settings?.orgUnitSelection !== "import";
        await CompositionRoot.attach().templates.download.execute({
            api,
            type,
            orgUnits: showOrgUnitsOnGeneration ? orgUnits : [],
            populate: showOrgUnitsOnGeneration && populate,
            startDate,
            endDate,
            ...rest,
        });

        loading.show(false);
    };

    return (
        <React.Fragment>
            <Paper
                style={{
                    margin: "2em",
                    marginTop: "2em",
                    padding: "2em",
                    width: "50%",
                    display: settings.isTemplateGenerationVisible() ? "block" : "none",
                }}
            >
                <h1>{i18n.t("Template Generation")}</h1>

                <TemplateSelector settings={settings} themes={themes} onChange={setTemplate} />

                <div
                    className="row"
                    style={{
                        marginTop: "2em",
                        marginLeft: "2em",
                        marginRight: "2em",
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleTemplateDownloadClick}
                    >
                        {i18n.t("Download template")}
                    </Button>
                </div>
            </Paper>
        </React.Fragment>
    );
}
