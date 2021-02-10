import Spacing from "material-ui/styles/spacing";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import { blue100, blue700, darkBlack, grey100, grey400, grey500, orange500, white } from "material-ui/styles/colors";
import { fade } from "material-ui/utils/colorManipulator";

const theme = {
    spacing: Spacing,
    fontFamily: "Roboto, sans-serif",
    palette: {
        primary1Color: "#276696",
        primary2Color: blue700,
        primary3Color: blue100,
        accent1Color: orange500,
        accent2Color: grey100,
        accent3Color: grey500,
        textColor: darkBlack,
        alternateTextColor: white,
        canvasColor: white,
        borderColor: grey400,
        disabledColor: fade(darkBlack, 0.3),
    },
};

function createAppTheme(style) {
    return {
        sideBar: {
            backgroundColor: "#F3F3F3",
            backgroundColorItem: "transparent",
            backgroundColorItemActive: style.palette.accent2Color,
            textColor: style.palette.textColor,
            textColorActive: style.palette.primary1Color,
            borderStyle: "1px solid #e1e1e1",
        },
        forms: {
            minWidth: 350,
            maxWidth: 900,
        },
    };
}

const muiTheme = getMuiTheme(theme);
const appTheme = createAppTheme(theme);

export default Object.assign({}, muiTheme, appTheme);
