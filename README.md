# DHIS2 Bulk Load

This bulk load app allows the user import data and produce templates for the same purpose.

## Prepare the environment

All the required dependencies to develop the app can be achieved through npm.

```
$ yarn install
```

## Start a development server

-   Edit .env file to set `REACT_APP_DHIS2_BASE_URL`.

-   Execute development server

```
$ yarn start
```

## Build a release package

-   Create a packaged zip

```
$ yarn build-webapp
```
