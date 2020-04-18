import _ from "lodash";
import XLSX, { Workbook } from "xlsx-populate";
import { DataSource, SheetRef, StyleSource, Template } from "../domain/entities/Template";
import { Theme, ThemeStyle } from "../domain/entities/Theme";

export class XLSXPopulateTemplate implements Template {
    protected workbook: Workbook | undefined;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly url: string | undefined,
        public readonly dataSources: DataSource[],
        public readonly styleSources: StyleSource[]
    ) {}

    public async initialize() {
        if (this.workbook) {
            return;
        } else if (this.url) {
            const response = await fetch(this.url);
            const data = await response.arrayBuffer();
            this.workbook = await XLSX.fromDataAsync(data);
        } else {
            this.workbook = await XLSX.fromBlankAsync();
        }
    }

    public async toBlob(): Promise<Blob> {
        if (!this.workbook) throw new Error("Failed to read workbook");
        const data = await this.workbook.outputAsync();
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    public applyTheme(theme: Theme): void {
        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const { source } = this.styleSources.find(source => source.section === section) ?? {};
            if (source) this.applyThemeToRange(source, style);
        });

        _.forEach(theme.pictures, ({ name, src, sheet, from, to }) => {
            // @ts-ignore: This part is not typed (we need to create an extension)
            this.workbook?.sheet(sheet).drawings(name).image(src).from(from).to(to);
        });
    }

    public parseData(file: File): void {
        throw new Error("Method not implemented.");
    }

    private applyThemeToRange(source: SheetRef, style: ThemeStyle): void {
        const { sheet } = source;
        const { text, bold, italic, fontSize, fontColor, fillColor } = style;

        try {
            const range =
                source.type === "range"
                    ? this.workbook?.sheet(sheet).range(source.ref)
                    : this.workbook?.sheet(sheet).range(`${source.ref}:${source.ref}`);

            this.workbook
                ?.sheet(sheet)
                .range(range?.address() ?? "")
                .merged(true)
                .style({
                    bold,
                    italic,
                    fontSize,
                    fontColor,
                    fill: fillColor,
                })
                .value(text);
        } catch (error) {
            console.error("Could not apply style", { source, style, error });
        }
    }
}
