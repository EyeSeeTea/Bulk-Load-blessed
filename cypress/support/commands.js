// <reference types="Cypress" />

import _ from "lodash";

const externalUrl = Cypress.env("EXTERNAL_API");
const appUrl = Cypress.env("ROOT_URL");
const dhis2AuthEnvValue = Cypress.env("DHIS2_AUTH");

if (!dhis2AuthEnvValue) {
    throw new Error("CYPRESS_DHIS2_AUTH=user1:pass1[,user2:pass2,...] not set");
}

if (!externalUrl) {
    throw new Error("CYPRESS_EXTERNAL_API not set");
}

if (!appUrl) {
    throw new Error("CYPRESS_ROOT_URL not set");
}

Cypress.config("baseUrl", appUrl);

const dhis2Auth = _(dhis2AuthEnvValue)
    .split(",")
    .map(auth => auth.split(":"))
    .fromPairs()
    .value();

Cypress.Cookies.defaults({
    preserve: "JSESSIONID",
});

Cypress.Commands.add("login", (username, _password = null) => {
    cy.server();

    const password = _password || dhis2Auth[username];

    cy.log("Login", { username });
    cy.request({
        method: "GET",
        url: `${externalUrl}/api/me`,
        auth: { user: username, pass: password },
        log: true,
    });
});

Cypress.on("window:before:load", win => {
    win.fetch = null;
});

Cypress.on("uncaught:exception", (err, runnable) => {
    // returning false here prevents Cypress from failing the test
    console.error("uncaught:exception", { err, runnable });
    return false;
});

Cypress.Commands.add("waitForStep", stepName => {
    cy.contains(stepName).should($el => {
        expect($el.attr("class")).to.contain("current-step", `Current step should be ${stepName}`);
    });
});

Cypress.Commands.add("selectInMultiSelector", (selector, option) => {
    cy.get(selector + " > div select:first").select(option);
    cy.contains("Selected").next("button").click();
});

Cypress.Commands.add("unselectInMultiSelector", (containerSelector, option) => {
    const selector = containerSelector ? containerSelector + " > div select:last" : "select:last";

    cy.get(selector).select(option);
    cy.contains("Selected").next("button").next("button").click();
});

Cypress.Commands.add("selectInOrgUnitTree", label => {
    cy.contains(label).find("input").click();
    cy.contains(label).should("have.css", "color").and("equal", "rgb(255, 165, 0)");
});

Cypress.Commands.add("expandInOrgUnitTree", (container, orgUnit) => {
    cy.get(container).contains(orgUnit).parent().parent().contains("▸").click();
});

Cypress.Commands.add("selectRowInTableByText", text => {
    cy.get("table").contains(text).click();
});

Cypress.Commands.add("checkRowCheckboxByText", text => {
    cy.get("table").contains(text).parent().find("input").click();
});

Cypress.Commands.add("selectFilterInTable", (filterLabel, filterValue) => {
    cy.selectInDropdown("#app", filterLabel, filterValue);
});

Cypress.Commands.add("selectInDropdown", (containerSelector, label, option) => {
    const parent = containerSelector ? cy.get(containerSelector) : cy;

    parent.contains(label).parent().click();

    cy.get('[role="listbox"]').contains(option).click();
});

Cypress.Commands.add("loadPage", path => {
    cy.visit(path);
    cy.get("#app", { log: false, timeout: 20000 }); // Waits for the page to fully load
});
