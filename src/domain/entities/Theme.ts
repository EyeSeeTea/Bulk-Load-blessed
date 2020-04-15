import { CellRef } from "./Template";

export type CellColor = string;

export interface StyledCell {
    text: string;
    ref: CellRef;
    color?: CellColor;
    bold?: boolean;
    italics?: boolean;
    size?: number;
}

export interface CellImage {
    ref: CellRef;
    src: string;
}

export interface ColorPattern {
    header?: CellColor;
    title?: CellColor;
    subtitle?: CellColor;
    footer?: CellColor;
}

export interface Theme {
    header: StyledCell;
    title: StyledCell;
    subtitle: StyledCell;
    footer: StyledCell;
    logo: CellImage;
    colorPattern: ColorPattern;
}
