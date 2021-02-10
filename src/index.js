import { Provider } from "@dhis2/app-runtime";
import i18n from "@dhis2/d2-i18n";
import axios from "axios";
import { init } from "d2";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";
import { D2ApiDefault } from "./types/d2-api";
import App from "./webapp/components/app/App";

async function getBaseUrl() {
    if (process.env.NODE_ENV === "development") {
        const baseUrl = process.env.REACT_APP_DHIS2_BASE_URL || "http://localhost:8080";
        return baseUrl.replace(/\/*$/, "");
    } else {
        const { data: manifest } = await axios.get("manifest.webapp");
        return manifest.activities.dhis.href;
    }
}

const isLangRTL = code => {
    const langs = ["ar", "fa", "ur"];
    const prefixed = langs.map(c => `${c}-`);
    return _(langs).includes(code) || prefixed.filter(c => code && code.startsWith(c)).length > 0;
};

const configI18n = ({ keyUiLocale: uiLocale }) => {
    i18n.changeLanguage(uiLocale);
    document.documentElement.setAttribute("dir", isLangRTL(uiLocale) ? "rtl" : "ltr");
};

async function main() {
    const baseUrl = await getBaseUrl();

    try {
        const d2 = await init({ baseUrl: baseUrl + "/api", schemas: [] });
        const api = new D2ApiDefault({ baseUrl });
        Object.assign(window, { d2, api });

        const userSettings = await api.get("/userSettings").getData();
        configI18n(userSettings);

        ReactDOM.render(
            <React.StrictMode>
                <Provider config={{ baseUrl, apiVersion: "30" }}>
                    <App d2={d2} api={api} />
                </Provider>
            </React.StrictMode>,
            document.getElementById("root")
        );
    } catch (err) {
        console.error(err);
        const message = err.toString().match("Unable to get schemas") ? (
            <h3 style={{ margin: 20 }}>
                <a rel="noopener noreferrer" target="_blank" href={baseUrl}>
                    Login
                </a>
                {` ${baseUrl}`}
            </h3>
        ) : (
            err.toString()
        );
        ReactDOM.render(<div>{message}</div>, document.getElementById("root"));
    }
}

main();
