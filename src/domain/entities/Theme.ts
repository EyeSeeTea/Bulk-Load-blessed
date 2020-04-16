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
    src: string;
}

export type ColorPattern = {
    [key in ThemeableSections]?: Color;
};

export type Theme =
    | {
          [key in ThemeableSections]?: ThemeStyle;
      }
    | {
          logo: CellImage;
          colorPattern: ColorPattern;
      };
