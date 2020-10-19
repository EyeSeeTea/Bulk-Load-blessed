module.exports = process.env.CYPRESS_E2E
    ? {}
    : {
          presets: ["babel-preset-react-app"],
      };
