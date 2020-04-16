import { Id } from "./ReferenceObject";

export type Color = string;

export type ThemeableSections = "header" | "title" | "subtitle" | "footer";

export interface ThemeStyle {
    text?: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontColor?: Color;
    fillColor?: Color;
}

export interface CellImage {
    sheet: string;
    name: string;
    src: File;
    from: string;
    to: string;
}

export type ColorPattern = {
    [key in ThemeableSections]?: Color;
};

export interface Theme {
    id: Id;
    name: string;
    templates: Id[];
    sections?: {
        [key in ThemeableSections]?: ThemeStyle;
    };
    pictures?: CellImage[];
    colorPattern?: ColorPattern;
}
