/// <reference types='Cypress' />

context("Landing page", () => {
    before(() => {
        cy.login("admin");
        cy.loadPage();
    });

    it("has page title", () => {
        cy.title().should("equal", "Bulk Load | DHIS2");
    });
});
