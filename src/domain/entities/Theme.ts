import { generateUid } from "d2/uid";
import _ from "lodash";
import { Id } from "./ReferenceObject";
import { Validation } from "./Validation";

export type Color = string;

export type ThemeableSections = "header" | "title" | "subtitle" | "footer";
export type ImageSections = "logo";

export interface ThemeStyle {
    text?: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontColor?: Color;
    fillColor?: Color;
}

export interface CellImage {
    name: string;
    src: File;
}

export class Theme {
    public readonly id: Id;
    public readonly name: string;
    public readonly templates: Id[];
    public readonly sections?: {
        [key in ThemeableSections]?: ThemeStyle;
    };
    public readonly pictures?: {
        [key in ImageSections]?: CellImage;
    };

    constructor({
        id = generateUid(),
        name = "",
        templates = [],
        sections = {},
        pictures = {},
    }: Partial<Theme> = {}) {
        this.id = id;
        this.name = name;
        this.templates = templates;
        this.sections = sections;
        this.pictures = pictures;
    }

    public update(partialUpdate: Partial<Theme>): Theme {
        return new Theme({ ...this, ...partialUpdate });
    }

    public setName(name: string): Theme {
        return this.update({ name });
    }

    public setTemplates(templates: Id[]): Theme {
        return this.update({ templates });
    }

    public updateSection(section: ThemeableSections, style: ThemeStyle): Theme {
        const sections = { ...this.sections, [section]: style };
        return this.update({ sections });
    }

    public validate(): Validation {
        return _.pickBy({
            name: _.compact([
                !this.name.trim()
                    ? {
                          key: "cannot_be_blank",
                          namespace: { field: "name" },
                      }
                    : null,
            ]),
        });
    }
}
