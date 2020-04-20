import _ from "lodash";
import XLSX, { Workbook } from "xlsx-populate";
import { SheetRef, Template } from "../domain/entities/Template";
import { CellImage, Theme, ThemeStyle } from "../domain/entities/Theme";
import { ExcelRepository } from "../domain/repositories/ExcelRepository";
import { fromBase64 } from "../utils/files";

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
        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source) this.applyThemeToRange(template, source, style);
        });

        _.forOwn(theme.pictures, async (image: CellImage, section: string) => {
            const src = await fromBase64(image.src);
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source) this.applyImageToRange(template, source, src);
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
        const cellStyle = _.omitBy(
            {
                bold,
                italic,
                fontSize,
                fontColor,
                fill: fillColor,
            },
            _.isUndefined
        );
        const range =
            source.type === "range"
                ? workbook.sheet(sheet).range(source.ref)
                : workbook.sheet(sheet).range(`${source.ref}:${source.ref}`);

        try {
            workbook
                .sheet(sheet)
                .range(range?.address() ?? "")
                .merged(true)
                .style(cellStyle)
                .value(text);
        } catch (error) {
            console.error("Could not apply style", { source, style, error });
        }
    }

    private async applyImageToRange(
        template: Template,
        source: SheetRef,
        file: File
    ): Promise<void> {
        const { sheet, ref } = source;
        const workbook = await this.getWorkbook(template);
        const [from, to] = source.type === "range" ? String(ref).split(":") : [ref, ref];

        // @ts-ignore: This part is not typed (we need to create an extension)
        const drawings = workbook.sheet(sheet).drawings();
        const name = drawings[0]?.name();
        // @ts-ignore: This part is not typed (we need to create an extension)
        workbook.sheet(sheet).drawings(name).image(file).from(from).to(to);
    }
}
