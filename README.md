
![logo_bulkload_eyeseetea_dhis2_suite_apps](https://github.com/EyeSeeTea/Bulk-Load-blessed/assets/108925044/c207c818-824d-44ff-ba9f-af31b1e94a1e)

# DHIS2 Bulk Load

Bulk Load is a DHIS2 Web Application part of [EyeSeeTea's DHIS2 Suite](https://eyeseetea.com/dhis2-apps/) designed to ease the integration of data from excel
into DHIS2 and generate templates for datasets and programs.

## Documentation

You can find a detailed user and developer guide [at the wiki](https://github.com/EyeSeeTea/Bulk-Load-blessed/wiki) and also our [road map](https://github.com/orgs/EyeSeeTea/projects/45) You can download User Extended from the [DHIS2 App Hub](https://apps.dhis2.org/app/ce68be24-22ce-4cfd-98f7-71f4a0155a0f)

For more links, see the [Bulk Load App website](https://eyeseetea.github.io/Bulk-Load-blessed/index.html)

## Feedback

We’d like to hear your thoughts on the app in general, improvements, new features or any of the technologies being used. Just drop as a line at community@eyeseetea.com and let us know! If you prefer, you can also [create a new issue](https://github.com/EyeSeeTea/Bulk-Load-blessed/issues) on our GitHub repository. Note that you will have to register and be logged in to GitHub to create a new issue.

### About & Sponsorships

Bulk Load App development is sustainable thanks to the partners for which we build customized DHIS2 solutions. This application has been funded by the WHO Global Malaria Programme, Samaritan’s Purse, Medecins Sans Frontières (MSF), the Norwegian Refugee Council (NRC) and the Clinton Health Access Initiative (CHAI) to support countries in strengthening the collection and use of health data by using DHIS2. 

Also, the WHO Integrated Data Platform (WIDP), where several WHO departments and units share a dedicated hosting and maintenance provided by EyeSeeTea, back some specific new features. The Long Term Agreement EyeSeeTea holds with WHO for this maintenance includes maintenance of this application, ensuring that it will always work at least with the last version of WIDP. We are passionate about both DHIS2 and open source, so giving back to the community through dedicated open-source development is and will always be part of EyeSeeTea’s commitment.

You can also [support our work through a one-time contribution or becoming a regular github sponsor](https://github.com/sponsors/EyeSeeTea)

<p align="center">
  <a href="https://eyeseetea.github.io/user-extended-app-blessed/"> <img src="https://github.com/EyeSeeTea/Bulk-Load-blessed/assets/108925044/9aecf851-ceb2-4070-8a43-da3fae9bbe19"> </a>
</p>



## Setup

Install dependencies:

```
$ yarn install
```

## Development

Start the development server:

```
$ PORT=8081 REACT_APP_DHIS2_BASE_URL="http://localhost:8080" yarn start
```

Now in your browser, go to `http://localhost:8081`.

Notes:

-   Requests to DHIS2 will be transparently proxied (see `src/setupProxy.js`) from `http://localhost:8081/dhis2/path` to `http://localhost:8080/path` to avoid CORS and cross-domain problems.

-   The optional environment variable `REACT_APP_DHIS2_AUTH=USERNAME:PASSWORD` forces some credentials to be used by the proxy. This variable is usually not set, so the app has the same user logged in at `REACT_APP_DHIS2_BASE_URL`.

-   The optional environment variable `REACT_APP_PROXY_LOG_LEVEL` can be helpful to debug the proxyfied requests (accepts: "warn" | "debug" | "info" | "error" | "silent")

-   Create a file `.env.local` (copy it from `.env`) to customize environment variables so you can simply run `yarn start`.

-   [why-did-you-render](https://github.com/welldone-software/why-did-you-render) is installed, but it does not work when using standard react scripts (`yarn start`). Instead, use `yarn craco-start` to debug re-renders with WDYR. Note that hot reloading does not work out-of-the-box with [craco](https://github.com/gsoft-inc/craco).

## Tests

### Unit tests

```
$ yarn test
```

### Integration tests (Cypress)

Create the required users for testing (`cypress/support/App.ts`) in your instance and run:

```
$ export CYPRESS_EXTERNAL_API="http://localhost:8080"
$ export CYPRESS_ROOT_URL=http://localhost:8081

# non-interactive
$ yarn cy:e2e:run

# interactive UI
$ yarn cy:e2e:open
```

## Build app ZIP

```
$ yarn build
```

## i18n

```
$ yarn localize
```

### App context

The file `src/webapp/contexts/app-context.ts` holds some general context so typical infrastructure objects (`api`, `d2`, ...) are readily available. Add your own global objects if necessary.

### Import XLSX files (from filled templates)

You can use the script `import-multiple-files.ts` to import multiple xlsx files:

```bash
#!/bin/bash

npx ts-node src/scripts/import-multiple-files.ts \
    --dhis2-url="http://admin:district@localhost:8080" \
    --results-path="/path/to/folder/for/json_results" \
    file1.xlsx file2.xlsx
```
