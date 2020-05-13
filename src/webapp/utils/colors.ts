import { isString } from "lodash/fp";
import colorbrewer from "./colorbrewer";

// Allowed color scales from ColorBrewer for EE (needs to have at least 9 classes)
export const colorScales = [
    "YlOrBr",
    "Reds",
    "YlGn",
    "Greens",
    "Blues",
    "BuPu",
    "RdPu",
    "PuRd",
    "Greys",
    "YlOrBr_reverse",
    "Reds_reverse",
    "YlGn_reverse",
    "Greens_reverse",
    "Blues_reverse",
    "BuPu_reverse",
    "RdPu_reverse",
    "PuRd_reverse",
    "Greys_reverse",
    "PuOr",
    "BrBG",
    "PRGn",
    "PiYG",
    "RdBu",
    "RdGy",
    "RdYlBu",
    "Spectral",
    "RdYlGn",
    "Paired",
    "Pastel1",
    "Set1",
    "Set3",
];

// Returns a color brewer scale for a number of classes
export const getColorPalette = (scale: string, classes: number): string[] => {
    return colorbrewer[scale][classes];
};

// Returns color scale name for a palette
export const getColorScale = (palette: string[]) => {
    return colorScales.find(name => colorbrewer[name][palette.length] === palette);
};

export const defaultColorScaleName = "YlOrBr";
export const defaultClasses = 9;
export const defaultColorScale = getColorPalette(defaultColorScaleName, defaultClasses);

// Correct colors not adhering to the css standard (add missing #)
export const cssColor = (color: string) => {
    if (!isString(color)) {
        return color;
    } else if (color === "##normal") {
        // ##normal is used in old map favorites
        return null; // Will apply default color
    }
    return (/(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(color) ? "#" : "") + color;
};

export const defaultColors = [
    "ffee58",
    "ffca28",
    "ffa726",
    "ff7043",
    "e57373",
    "f06292",
    "ba68c8",
    "9575cd",
    "9fa8da",
    "90caf9",
    "90caf9",
    "80deea",
    "80cbc4",
    "a5d6a7",
    "c5e1a5",
    "e6ee9c",
];
