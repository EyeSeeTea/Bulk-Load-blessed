// https://on.cypress.io/plugins-guide

module.exports = (on, config) => {
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config
    on("task", {
        logRequest(req) {
            console.debug(req, config);
        },
    });
};
