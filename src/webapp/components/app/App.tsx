//@ts-ignore
import { useConfig } from "@dhis2/app-runtime";
import { LinearProgress } from "@material-ui/core";
import { MuiThemeProvider } from "@material-ui/core/styles";
import { LoadingProvider, SnackbarProvider } from "d2-ui-components";
import _ from "lodash";
//@ts-ignore
import OldMuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import React, { useEffect, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { useAppContext } from "../../contexts/api-context";
import Root from "../../pages/root/RootPage";
import Share from "../share/Share";
import "./App.css";
import muiThemeLegacy from "./themes/dhis2-legacy.theme";
import { muiTheme } from "./themes/dhis2.theme";

interface AppConfig {
    appKey: string;
    appearance: {
        showShareButton: boolean;
    };
    feedback: {
        token: string[];
        createIssue: boolean;
        sendToDhis2UserGroups: string[];
        issues: {
            repository: string;
            title: string;
            body: string;
        };
        snapshots: {
            repository: string;
            branch: string;
        };
        feedbackOptions: {};
    };
}

interface AppWindow extends Window {
    $: {
        feedbackDhis2: (
            d2: unknown,
            appKey: string,
            appConfig: AppConfig["feedback"]["feedbackOptions"]
        ) => void;
    };
}

function initFeedbackTool(d2: unknown, appConfig: AppConfig): void {
    const appKey = _(appConfig).get("appKey");

    if (appConfig && appConfig.feedback) {
        const feedbackOptions = {
            ...appConfig.feedback,
            i18nPath: "feedback-tool/i18n",
        };
        ((window as unknown) as AppWindow).$.feedbackDhis2(d2, appKey, feedbackOptions);
    }
}

const App = () => {
    const { baseUrl } = useConfig();
    const { d2 } = useAppContext();

    const [showShareButton, setShowShareButton] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const run = async () => {
            const appConfig = await fetch("app-config.json").then(res => res.json());
            CompositionRoot.initialize({ appConfig, dhisInstance: { url: baseUrl } });

            setShowShareButton(_(appConfig).get("appearance.showShareButton") || false);
            initFeedbackTool(d2, appConfig);
            setLoading(false);
        };

        run();
    }, [d2, baseUrl]);

    if (loading) {
        return (
            <div style={{ margin: 20 }}>
                <h3>Connecting to {baseUrl}...</h3>
                <LinearProgress />
            </div>
        );
    }

    return (
        <MuiThemeProvider theme={muiTheme}>
            <OldMuiThemeProvider muiTheme={muiThemeLegacy}>
                <LoadingProvider>
                    <SnackbarProvider>
                        <div id="app">
                            <Root />
                        </div>
                        <Share visible={showShareButton} />
                    </SnackbarProvider>
                </LoadingProvider>
            </OldMuiThemeProvider>
        </MuiThemeProvider>
    );
};

export default App;
