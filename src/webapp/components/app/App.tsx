//@ts-ignore
import { useConfig } from "@dhis2/app-runtime";
import { LoadingProvider, SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { MuiThemeProvider } from "@material-ui/core/styles";
import _ from "lodash";
//@ts-ignore
import OldMuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import React, { useEffect, useState } from "react";
import { getCompositionRoot } from "../../../CompositionRoot";
import { D2Api } from "../../../types/d2-api";
import { addExtraTranslations } from "../../../utils/translations";
import { AppContext, AppContextI } from "../../contexts/app-context";
import Settings from "../../logic/settings";
import { Router } from "../../pages/Router";
import { useMigrations } from "../migrations/hooks";
import Migrations from "../migrations/Migrations";
import Share from "../share/Share";
import "./App.css";
import muiThemeLegacy from "./themes/dhis2-legacy.theme";
import { muiTheme } from "./themes/dhis2.theme";

export interface AppProps {
    api: D2Api;
    d2: object;
}

export const App: React.FC<AppProps> = React.memo(({ api, d2 }) => {
    const { baseUrl } = useConfig();

    const [showShareButton, setShowShareButton] = useState(false);
    const [appContext, setAppContext] = useState<AppContextI | null>(null);
    const migrations = useMigrations(appContext);

    useEffect(() => {
        const run = async () => {
            const appConfig = await fetch("app-config.json").then(res => res.json());
            const compositionRoot = getCompositionRoot({
                appConfig,
                dhisInstance: { type: "local", url: baseUrl },
            });
            const settings = await Settings.build(api, compositionRoot);

            setShowShareButton(_(appConfig).get("appearance.showShareButton") || false);

            initFeedbackTool(d2, appConfig, settings.currentUser.username);
            setAppContext({ d2: d2 as object, api, compositionRoot });
            addExtraTranslations();
        };

        run();
    }, [d2, api, baseUrl]);

    if (!appContext) {
        return null;
    }

    if (migrations.state.type === "pending") {
        return (
            <AppContext.Provider value={appContext}>
                <Migrations migrations={migrations} />
            </AppContext.Provider>
        );
    }

    if (migrations.state.type === "checked") {
        return (
            <AppContext.Provider value={appContext}>
                <MuiThemeProvider theme={muiTheme}>
                    <OldMuiThemeProvider muiTheme={muiThemeLegacy}>
                        <LoadingProvider>
                            <SnackbarProvider>
                                <div id="app">
                                    <Router />
                                </div>
                                <Share visible={showShareButton} />
                            </SnackbarProvider>
                        </LoadingProvider>
                    </OldMuiThemeProvider>
                </MuiThemeProvider>
            </AppContext.Provider>
        );
    }

    return null;
});

interface AppConfig {
    appKey: string;
    appearance: {
        showShareButton: boolean;
    };
    feedback: {
        createIssue: boolean;
        sendToDhis2UserGroups: string[];
        clickUp?: {
            apiUrl: string;
            listId: string;
            title: string;
            body: string;
            status: string;
        };
        snapshots: {
            repository: string;
            branch: string;
        };
        feedbackOptions: object;
    };
}

function initFeedbackTool(d2: object, appConfig: AppConfig, username: string): void {
    if (appConfig && appConfig.feedback) {
        const options = {
            ...appConfig.feedback,
            i18nPath: "feedback-tool/i18n",
        };
        const clickup = window.feedbackClickUp({ ...options.clickUp, username });
        window.$.feedback({
            postFunction: (data: any) => {
                return clickup.send(data).then(data.success, data.error);
            },
            buttonPosition: "bottom",
            undefined,
            ...options.feedbackOptions,
        });
    }
}

export default App;
