# DHIS2 Bulk Load

The bulk load application allows generating templates (excel sheet) and importing multiple data (data values) in a 2.30 DHIS2 instance.

## Prepare the environment

All the required dependencies to develop the app can be achieved through npm.

```
$ yarn install
```

## Start a development server

-   Edit .env file to set `PORT` and `REACT_APP_DHIS2_BASE_URL`.

-   Execute development server

```
$ yarn start
```

## Tests

Run integration tests locally:

```
$ export CYPRESS_DHIS2_AUTH='admin:district'
$ export CYPRESS_EXTERNAL_API="http://localhost:8080"
$ export CYPRESS_ROOT_URL=http://localhost:8081

$ yarn cy:e2e:open # interactive UI
$ [xvfb-run] yarn cy:e2e:run # non-interactive UI
```

For cypress tests to work in Travis CI, you will have to create an environment variable CYPRESS_DHIS2_AUTH (Settings -> Environment Variables) with the authentication used in your testing DHIS2 instance.

## Build a release package

-   Create a packaged zip

```
$ yarn build-webapp
```

## i18n

### Update an existing language

```
$ yarn update-po
# ... add/edit translations in po files ...
$ yarn localize
```

### Create a new language

```
$ cp i18n/en.pot i18n/es.po
# ... add translations to i18n/es.po ...
$ yarn localize
```
