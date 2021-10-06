import "@testing-library/cypress/add-commands";
import * as qs from "qs";

const appUrl: string = Cypress.env("ROOT_URL") || "";

const dhis2Url: string = appUrl + "/dhis2";

function setup() {
    Cypress.config("baseUrl", appUrl);

    Cypress.Cookies.defaults({ preserve: "JSESSIONID" });

    Cypress.on("uncaught:exception", (err, runnable) => {
        console.error("uncaught:exception", { err, runnable });
        // returning false here prevents Cypress from failing the test
        return false;
    });
}

setup();

/* Public interface */

export function getApiUrl(path: string, params?: Record<string, number | boolean | string | string[]>) {
    const baseUrl = dhis2Url.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
    const queryString = qs.stringify(params || {}, { arrayFormat: "repeat", addQueryPrefix: true });
    return baseUrl + queryString;
}
