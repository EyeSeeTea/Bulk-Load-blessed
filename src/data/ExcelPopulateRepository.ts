import _ from "lodash";
import XLSX, { Workbook } from "xlsx-populate";
import { SheetRef, Template } from "../domain/entities/Template";
import { Theme, ThemeStyle } from "../domain/entities/Theme";
import { ExcelRepository } from "../domain/repositories/ExcelRepository";

export class ExcelPopulateRepository implements ExcelRepository {
    private workbooks: Record<string, Workbook> = {};

    public async reset(template: Template): Promise<void> {
        await this.getWorkbook(template, true);
    }

    public async toBlob(template: Template): Promise<Blob> {
        const workbook = await this.getWorkbook(template);
        const data = await workbook.outputAsync();
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    public async applyTheme(template: Template, theme: Theme): Promise<void> {
        const workbook = await this.getWorkbook(template);

        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const { source } =
                template.styleSources.find(source => source.section === section) ?? {};
            if (source) this.applyThemeToRange(template, source, style);
        });

        _.forEach(theme.pictures, ({ name, src, sheet, from, to }) => {
            // @ts-ignore: This part is not typed (we need to create an extension)
            workbook.sheet(sheet).drawings(name).image(src).from(from).to(to);
        });
    }

    private async getWorkbook(template: Template, reload = false) {
        const { id, url } = template;
        const loaded = !!this.workbooks[id] && !reload;

        if (!loaded && url) {
            const response = await fetch(url);
            const data = await response.arrayBuffer();
            this.workbooks[id] = await XLSX.fromDataAsync(data);
        } else if (!loaded) {
            this.workbooks[id] = await XLSX.fromBlankAsync();
        }

        return this.workbooks[id];
    }

    private async applyThemeToRange(
        template: Template,
        source: SheetRef,
        style: ThemeStyle
    ): Promise<void> {
        const { sheet } = source;
        const { text, bold, italic, fontSize, fontColor, fillColor } = style;
        const workbook = await this.getWorkbook(template);

        try {
            const range =
                source.type === "range"
                    ? workbook.sheet(sheet).range(source.ref)
                    : workbook.sheet(sheet).range(`${source.ref}:${source.ref}`);

            workbook
                .sheet(sheet)
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
