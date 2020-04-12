# DHIS2 Bulk Load

The Bulk Load application generates templates (an Excel sheet) and imports multiple data values for DHIS2 v2.30 instances. Some notes:

-   Settings are only visible for superusers (`ALL` authority) or users that belong to the settings groups.
-   The generation box is only visible for users that belong to the configurable `Template Generation` groups (initial value: `HMIS Officers`).

## Set up

```
$ yarn install
```

## Start a development server

Edit .env file to set `PORT` and `REACT_APP_DHIS2_BASE_URL` (or use normal shell environment variables) and execute the development server:

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
$ yarn cy:e2e:run # non-interactive UI
```

For cypress tests to work in Travis CI, you will have to create an environment variable CYPRESS_DHIS2_AUTH (Settings -> Environment Variables) with the authentication used in your testing DHIS2 instance.

## Build a release package

Create a packaged zip:

```
$ yarn build-webapp
```

## i18n

### Update translations

```
$ yarn update-po
# ... add/edit translations in po files ...
$ yarn localize
```
