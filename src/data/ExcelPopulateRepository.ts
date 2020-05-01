import _ from "lodash";
import XLSX, { Cell, Workbook } from "xlsx-populate";
import { DataPackage } from "../domain/entities/DataPackage";
import { GeneratedTemplate, RowDataSource, SheetRef, Template } from "../domain/entities/Template";
import { Theme, ThemeStyle } from "../domain/entities/Theme";
import { ExcelRepository, LoadOptions } from "../domain/repositories/ExcelRepository";
import { fromBase64 } from "../utils/files";
import { stringOrNumber } from "../utils/string";
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

    public async populateTemplate(
        template: GeneratedTemplate,
        payload: DataPackage[]
    ): Promise<void> {
        const { dataSources = [] } = template;
        for (const dataSource of dataSources) {
            switch (dataSource.type) {
                case "row":
                    await this.fillRows(dataSource, template, payload);
                    break;
                default:
                    throw new Error(`Type ${dataSource.type} not supported`);
            }
        }
    }

    private async fillRows(
        dataSource: RowDataSource,
        template: GeneratedTemplate,
        payload: DataPackage[]
    ) {
        const workbook = await this.getWorkbook(template);
        const defaultAccessor = (string?: string | number) => string;
        const { writeId = defaultAccessor, readId = defaultAccessor } = template;
        const {
            sheet: rangeSheet,
            columnStart,
            rowStart,
            columnEnd,
            rowEnd = "1024",
        } = dataSource.range;

        const rangeCells = workbook
            .sheet(rangeSheet)
            .range(`${columnStart}${rowStart}:${columnEnd}${rowEnd}`);
        const dataRows = rangeCells.cells()[Symbol.iterator]();

        for (const { orgUnit, period, attribute, dataValues } of payload) {
            const dataRow: Cell[] = dataRows.next().value;

            this.locateRelativeValue(workbook, dataRow[0], dataSource.orgUnit, writeId(orgUnit));
            this.locateRelativeValue(workbook, dataRow[0], dataSource.period, period);
            this.locateRelativeValue(
                workbook,
                dataRow[0],
                dataSource.attribute,
                attribute ? writeId(attribute) : undefined
            );

            for (const cell of dataRow) {
                const dataElement = this.locateRelativeValue(
                    workbook,
                    cell,
                    dataSource.dataElement
                );
                const category = this.locateRelativeValue(
                    workbook,
                    cell,
                    dataSource.categoryOption
                );
                const { value } =
                    dataValues.find(
                        dv =>
                            dv.dataElement === readId(dataElement) &&
                            dv.category === readId(category)
                    ) ?? {};

                cell.value(stringOrNumber(value));
            }
        }
    }

    private locateRelativeValue(
        workbook: Workbook,
        cell: Cell,
        location?: SheetRef,
        value?: string | number
    ): string | number | undefined {
        if (!location) return;
        const row = location.type === "row" ? location.ref : cell?.rowNumber();
        const column = location.type === "column" ? location.ref : cell?.columnName();
        const destination =
            location.type === "cell"
                ? workbook.sheet(location.sheet).cell(location.ref)
                : row && column
                ? workbook.sheet(location.sheet).cell(row, column)
                : undefined;

        //@ts-ignore
        const ranges = Object.keys(workbook.sheet(location.sheet)._mergeCells).map(key => {
            const range = workbook.sheet(location.sheet).range(key);
            const value = range.startCell().value() ?? range.startCell().formula();
            const hasCell = (cell: Cell) => range.cells()[0]?.includes(cell);

            return { range, value, hasCell };
        });

        if (!destination) {
            return undefined;
        } else if (!value) {
            const range = ranges.find(range => range.hasCell(destination));
            return String(range ? range.value : destination.value() ?? destination.formula());
        } else if (value?.toString().startsWith("=")) {
            destination.formula(String(value));
            return value;
        } else {
            destination.value(stringOrNumber(value));
            return value;
        }
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

    private buildRange({ type, ref, sheet }: SheetRef, workbook: Workbook) {
        return type === "range"
            ? workbook.sheet(sheet).range(String(ref))
            : workbook.sheet(sheet).range(`${ref}:${ref}`);
    }

    private applyThemeToRange(workbook: Workbook, source: SheetRef, style: ThemeStyle): void {
        const { sheet } = source;
        const { text, bold, italic, fontSize, fontColor, fillColor } = style;
        const range = this.buildRange(source, workbook);
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
        workbook.sheet(sheet).drawings("logo", file).from(from).to(to);
    }
}
