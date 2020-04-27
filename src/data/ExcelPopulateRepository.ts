import _ from "lodash";
import XLSX, { Workbook } from "xlsx-populate";
import { SheetRef, Template } from "../domain/entities/Template";
import { Theme, ThemeStyle } from "../domain/entities/Theme";
import { ExcelRepository, LoadOptions } from "../domain/repositories/ExcelRepository";
import { fromBase64 } from "../utils/files";
import { promiseMap } from "../webapp/utils/common";

export class ExcelPopulateRepository implements ExcelRepository {
    private workbooks: Record<string, Workbook> = {};

    public async loadTemplate(template: Template, options: LoadOptions): Promise<void> {
        const { id } = template;
        switch (options.type) {
            case "url": {
                const response = await fetch(options.url);
                const data = await response.arrayBuffer();
                this.workbooks[id] = await XLSX.fromDataAsync(data);
                break;
            }
            case "file": {
                this.workbooks[id] = await XLSX.fromDataAsync(options.file);
                break;
            }
            default: {
                this.workbooks[id] = await XLSX.fromBlankAsync();
                break;
            }
        }
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
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source) this.applyThemeToRange(workbook, source, style);
        });

        await promiseMap(_.toPairs(theme.pictures), async ([section, image]) => {
            const file = image ? await fromBase64(image.src) : undefined;
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source && file) this.applyImageToRange(workbook, source, file);
        });
    }

    private async getWorkbook(template: Template) {
        const { id } = template;
        if (!this.workbooks[id]) throw new Error("Template not loaded");

        return this.workbooks[id];
    }

    private applyThemeToRange(workbook: Workbook, source: SheetRef, style: ThemeStyle): void {
        const { sheet } = source;
        const { text, bold, italic, fontSize, fontColor, fillColor } = style;
        const textStyle = _.omitBy(
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
            if (text && range) {
                //@ts-ignore
                const richText = new XLSX.RichText();
                richText.add(text, textStyle);

                workbook
                    .sheet(sheet)
                    .range(range.address() ?? "")
                    .merged(true)
                    .style({ verticalAlignment: "center" })
                    .value(richText);

                const height = text.split("\n").length * 22;
                range.cells().map(([cell]) => cell.row().hidden(false).height(height));
            }
        } catch (error) {
            console.error("Could not apply style", { source, style, error });
        }
    }

    private applyImageToRange(workbook: Workbook, source: SheetRef, file: File): void {
        const { sheet, ref } = source;
        const [from, to] = source.type === "range" ? String(ref).split(":") : [ref, ref];

        // @ts-ignore: This part is not typed (we need to create an extension)
        const drawings = workbook.sheet(sheet).drawings();
        const name = drawings[0]?.name();
        // @ts-ignore: This part is not typed (we need to create an extension)
        workbook.sheet(sheet).drawings(name).image(file).from(from).to(to);
    }
}
