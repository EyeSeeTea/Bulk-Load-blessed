//@ts-ignore
import { useConfig } from "@dhis2/app-runtime";
import { LoadingProvider, SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { LinearProgress } from "@material-ui/core";
import { MuiThemeProvider } from "@material-ui/core/styles";
import _ from "lodash";
//@ts-ignore
import OldMuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import { useEffect, useState } from "react";
import { getCompositionRoot } from "../../../CompositionRoot";
import { D2Api } from "../../../types/d2-api";
import { AppContext, AppContextI } from "../../contexts/app-context";
import Root from "../../pages/root/RootPage";
import { useMigrations } from "../migrations/hooks";
import Migrations from "../migrations/Migrations";
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
        feedbackDhis2: (d2: unknown, appKey: string, appConfig: AppConfig["feedback"]["feedbackOptions"]) => void;
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

const App = (props: { d2: unknown; api: D2Api }) => {
    const { d2, api } = props;
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

            setShowShareButton(_(appConfig).get("appearance.showShareButton") || false);
            initFeedbackTool(d2, appConfig);
            setAppContext({ d2: d2 as object, api, compositionRoot });
        };

        run();
    }, [d2, api, baseUrl]);

    if (!appContext) {
        return (
            <div style={{ margin: 20 }}>
                <h3>Connecting to {baseUrl}...</h3>
                <LinearProgress />
            </div>
        );
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
                                    <Root />
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
};

export default App;
