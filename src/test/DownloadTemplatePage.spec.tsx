import { LoadingProvider, SnackbarProvider } from "@eyeseetea/d2-ui-components";
import "@testing-library/jest-dom/extend-expect";
import { act, render, screen } from "@testing-library/react";
import _ from "lodash";
import { getCompositionRoot } from "../CompositionRoot";
import { AppContext } from "../webapp/contexts/app-context";
import Settings from "../webapp/logic/settings";
import DownloadTemplatePage from "../webapp/pages/download-template/DownloadTemplatePage";
import { initializeMockServer } from "./mocks/server";

let settings: Settings;

const { api } = initializeMockServer();
const compositionRoot = getCompositionRoot({
    appConfig: {
        appKey: "bulk-load",
        storage: "dataStore",
    },
    dhisInstance: { type: "local", url: api.baseUrl },
    mockApi: api,
});

const renderComponent = async () => {
    await act(async () => {
        render(
            <AppContext.Provider value={{ api, d2: {}, compositionRoot }}>
                <LoadingProvider>
                    <SnackbarProvider>
                        <DownloadTemplatePage
                            settings={settings}
                            themes={[]}
                            setSettings={_.noop}
                            setThemes={_.noop}
                            customTemplates={[]}
                            setCustomTemplates={_.noop}
                        />
                    </SnackbarProvider>
                </LoadingProvider>
            </AppContext.Provider>
        );
    });
};

describe("ImportTemplatePage", () => {
    beforeAll(async () => {
        settings = await Settings.build(api, compositionRoot);
    });

    test("Renders correctly", async () => {
        await renderComponent();

        expect(screen.getByRole("heading", { name: "Template" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Advanced template properties" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Download template" })).toBeInTheDocument();
    });
});

export {};
