# DHIS2 Bulk Load

This bulk load app allows the user import data and produce templates for the same purpose.

## Prepare the environment

All the required dependencies to develop the app can be achieved through npm.

```
npm install
```

## Start a development server

- Create .env file with the following content

```
REACT_APP_DEBUG=true
REACT_APP_DHIS2_BASE_URL=http://who-dev.essi.upc.edu:8081
REACT_APP_DHIS2_USERNAME=username
REACT_APP_DHIS2_PASSWORD=password
```

- Launch Chrome with CORS disabled

https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome

- Execute development server

```
npm run start
```

## Build a release package

- Create a packaged zip

```
npm run build
```