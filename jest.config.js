module.exports = {
    setupTestFrameworkScriptFile: "<rootDir>/config/testSetup.ts",
    collectCoverageFrom: ["src/**/*.js"],
    testPathIgnorePatterns: ["/node_modules/", "/cypress"],
    transformIgnorePatterns: ["/node_modules/(?!d2-ui-components)"],
    modulePaths: ["src"],
    moduleNameMapper: {
        "raw-loader!": "<rootDir>/config/fileMock.js",
        "\\.(css|scss)$": "<rootDir>/config/styleMock.js",
        "\\.(jpg|jpeg|png|svg)$": "<rootDir>/config/fileMock.js",
    },
    transform: {
        "^.+\\.jsx?$": "babel-jest",
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "/src/.*(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testEnvironment: "jsdom",
    globals: {
        window: true,
        document: true,
        navigator: true,
        Element: true,
        "ts-jest": {
            tsConfig: "tsconfig.test.json",
        },
    },
    snapshotSerializers: ["enzyme-to-json/serializer"],
};
