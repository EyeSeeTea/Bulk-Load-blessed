import { colorScales, palettes } from "./palettes";

// Returns a color brewer scale for a number of classes
export const getColorPalette = (scale: string, classes: number): string[] => {
    return palettes[scale][classes];
};

// Returns color scale name for a palette
export const getColorScale = (palette: string[]) => {
    return colorScales.find(name => palettes[name][palette.length] === palette);
};

export const defaultColorScale = getColorPalette("default", 9);
