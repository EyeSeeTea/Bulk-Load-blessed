import _ from "lodash";
import { PaletteCollection } from "../../domain/entities/Palette";

// Returns a color brewer scale for a number of classes
export const getColorPalette = (palettes: PaletteCollection, scale: string, classes: number): string[] => {
    const palette = palettes[scale] ?? {};
    return palette[classes] ?? [];
};

// Returns color scale name for a palette
export const getColorScale = (palettes: PaletteCollection, palette: string[]) => {
    return _.keys(palettes).find(name => _.isEqual(getColorPalette(palettes, name, palette.length), palette));
};

export const generatorOriginalPalette = {
    default: {
        3: ["#ffee58", "#ffca28", "#ffa726"],
        4: ["#ffee58", "#ffca28", "#ffa726", "#ff7043"],
        5: ["#ffee58", "#ffca28", "#ffa726", "#ff7043", "#e57373"],
        6: ["#ffee58", "#ffca28", "#ffa726", "#ff7043", "#e57373", "#f06292"],
        7: ["#ffee58", "#ffca28", "#ffa726", "#ff7043", "#e57373", "#f06292", "#ba68c8"],
        8: ["#ffee58", "#ffca28", "#ffa726", "#ff7043", "#e57373", "#f06292", "#ba68c8", "#9575cd"],
        9: ["#ffee58", "#ffca28", "#ffa726", "#ff7043", "#e57373", "#f06292", "#ba68c8", "#9575cd", "#9fa8da"],
        10: [
            "#ffee58",
            "#ffca28",
            "#ffa726",
            "#ff7043",
            "#e57373",
            "#f06292",
            "#ba68c8",
            "#9575cd",
            "#9fa8da",
            "#90caf9",
        ],
        11: [
            "#ffee58",
            "#ffca28",
            "#ffa726",
            "#ff7043",
            "#e57373",
            "#f06292",
            "#ba68c8",
            "#9575cd",
            "#9fa8da",
            "#90caf9",
            "#80deea",
        ],
        12: [
            "#ffee58",
            "#ffca28",
            "#ffa726",
            "#ff7043",
            "#e57373",
            "#f06292",
            "#ba68c8",
            "#9575cd",
            "#9fa8da",
            "#90caf9",
            "#80deea",
            "#80cbc4",
        ],
        13: [
            "#ffee58",
            "#ffca28",
            "#ffa726",
            "#ff7043",
            "#e57373",
            "#f06292",
            "#ba68c8",
            "#9575cd",
            "#9fa8da",
            "#90caf9",
            "#80deea",
            "#80cbc4",
            "#a5d6a7",
        ],
        14: [
            "#ffee58",
            "#ffca28",
            "#ffa726",
            "#ff7043",
            "#e57373",
            "#f06292",
            "#ba68c8",
            "#9575cd",
            "#9fa8da",
            "#90caf9",
            "#80deea",
            "#80cbc4",
            "#a5d6a7",
            "#c5e1a5",
        ],
        15: [
            "#ffee58",
            "#ffca28",
            "#ffa726",
            "#ff7043",
            "#e57373",
            "#f06292",
            "#ba68c8",
            "#9575cd",
            "#9fa8da",
            "#90caf9",
            "#80deea",
            "#80cbc4",
            "#a5d6a7",
            "#c5e1a5",
            "#e6ee9c",
        ],
    },
};

export const defaultColorScale = getColorPalette(generatorOriginalPalette, "default", 9);
