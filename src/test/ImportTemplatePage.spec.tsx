import "@testing-library/jest-dom/extend-expect";
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { CompositionRoot } from "../CompositionRoot";
import { AppContext } from "../webapp/contexts/api-context";
import Settings from "../webapp/logic/settings";
import ImportTemplatePage from "../webapp/pages/import-template/ImportTemplatePage";
import { initializeMockServer } from "./mocks/server";

let settings: Settings;
const { api } = initializeMockServer();

const renderComponent = async () => {
    await act(async () => {
        render(
            <AppContext.Provider value={{ api, d2: {} }}>
                <ImportTemplatePage settings={settings} />
            </AppContext.Provider>
        );
    });
};

describe("ImportTemplatePage", () => {
    beforeAll(async () => {
        CompositionRoot.initialize({
            appConfig: {
                appKey: "bulk-load",
                storage: "dataStore",
            },
            dhisInstance: { url: api.baseUrl },
            mockApi: api,
        });

        settings = await Settings.build(api);
    });

    test("Renders correctly", async () => {
        await renderComponent();
        expect(screen.getByRole("heading")).toHaveTextContent("Bulk Import");
    });
});

export {};
