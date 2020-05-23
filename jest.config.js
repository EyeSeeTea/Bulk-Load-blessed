module.exports = {
    collectCoverageFrom: ["src/**/*.js"],
    testPathIgnorePatterns: ["/node_modules/", "/cypress"],
    transformIgnorePatterns: ["/node_modules/(?!d2-ui-components)"],
    modulePaths: ["<rootDir>"],
    moduleDirectories: ["node_modules"],
    moduleNameMapper: {
        "raw-loader!": "<rootDir>/config/fileMock.js",
        "\\.(css|scss)$": "<rootDir>/config/styleMock.js",
        "\\.(jpg|jpeg|png|svg)$": "<rootDir>/config/fileMock.js",
    },
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest",
    },
    testRegex: "/src/.*/.*(test|spec)\\.(jsx?|tsx?)$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testEnvironment: "jsdom",
    globals: {
        window: true,
        document: true,
        navigator: true,
        Element: true,
    },
};
