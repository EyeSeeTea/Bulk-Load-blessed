import _ from "lodash";
import XLSX, { Cell as ExcelCell, Workbook as ExcelWorkbook } from "xlsx-populate";
import { CellRef, Range, SheetRef, Template } from "../domain/entities/Template";
import { ThemeStyle } from "../domain/entities/Theme";
import { ExcelRepository, LoadOptions } from "../domain/repositories/ExcelRepository";
import { removeCharacters } from "../utils/string";
import i18n from "../locales";

export class ExcelPopulateRepository extends ExcelRepository {
    private workbooks: Record<string, ExcelWorkbook> = {};

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

    public async findRelativeCell(
        template: Template,
        location?: SheetRef,
        cellRef?: CellRef
    ): Promise<CellRef | undefined> {
        const workbook = await this.getWorkbook(template);

        if (location?.type === "cell") {
            const destination = workbook.sheet(location.sheet).cell(location.ref);
            return { type: "cell", sheet: destination.sheet().name(), ref: destination.address() };
        } else if (location && cellRef) {
            const cell = workbook.sheet(cellRef.sheet).cell(cellRef.ref);
            const row = location.type === "row" ? location.ref : cell.rowNumber();
            const column = location.type === "column" ? location.ref : cell.columnName();
            const destination = workbook.sheet(location.sheet).cell(row, column);
            return { type: "cell", sheet: destination.sheet().name(), ref: destination.address() };
        }
    }

    public async writeCell(
        template: Template,
        cellRef: CellRef,
        value: string | number | boolean
    ): Promise<void> {
        const workbook = await this.getWorkbook(template);
        const mergedCells = await this.buildMergedCells(template, cellRef.sheet);
        const definedNames = await this.listDefinedNames(template);
        const definedName = definedNames.find(
            name => removeCharacters(name) === removeCharacters(value)
        );
        const cell = workbook.sheet(cellRef.sheet).cell(cellRef.ref);
        const { startCell: destination = cell } =
            mergedCells.find(range => range.hasCell(cell)) ?? {};

        if (!isNaN(Number(value))) {
            destination.value(Number(value));
        } else if (String(value).startsWith("=")) {
            destination.formula(String(value));
        } else if (String(value) === "true") {
            destination.value("Yes");
        } else if (String(value) === "false") {
            destination.value("No");
        } else if (definedName) {
            destination.formula(`=${definedName}`);
        } else {
            destination.value(value);
        }
    }

    public async readCell(template: Template, cellRef: CellRef): Promise<string> {
        const workbook = await this.getWorkbook(template);
        const mergedCells = await this.buildMergedCells(template, cellRef.sheet);
        const cell = workbook.sheet(cellRef.sheet).cell(cellRef.ref);
        const { startCell: destination = cell } =
            mergedCells.find(range => range.hasCell(cell)) ?? {};

        return String(destination.value() ?? destination.formula());
    }

    public async getCellsInRange(template: Template, range: Range): Promise<CellRef[]> {
        const workbook = await this.getWorkbook(template);

        const { sheet, columnStart, rowStart, columnEnd = "CC", rowEnd = 4096 } = range;

        const rangeCells = workbook
            .sheet(sheet)
            .range(`${columnStart}${rowStart}:${columnEnd}${rowEnd}`);

        return rangeCells.cells()[0].map(cell => ({
            type: "cell",
            sheet,
            ref: cell.address(),
        }));
    }

    public async addPicture(template: Template, location: SheetRef, file: File): Promise<void> {
        const workbook = await this.getWorkbook(template);

        const { sheet, ref } = location;
        const [from, to] = location.type === "range" ? String(ref).split(":") : [ref, ref];

        // @ts-ignore: This part is not typed (we need to create an extension)
        workbook.sheet(sheet).drawings("logo", file).from(from).to(to);
    }

    public async styleCell(template: Template, source: SheetRef, style: ThemeStyle): Promise<void> {
        const workbook = await this.getWorkbook(template);

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
                //@ts-ignore Not properly typed
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

    private async buildMergedCells(template: Template, sheet: string | number) {
        const workbook = await this.getWorkbook(template);
        //@ts-ignore
        return Object.keys(workbook.sheet(sheet)._mergeCells).map(key => {
            const range = workbook.sheet(sheet).range(key);
            const startCell = range.startCell();
            const hasCell = (cell: ExcelCell) => range.cells()[0]?.includes(cell);

            return { range, startCell, hasCell };
        });
    }

    private async getWorkbook(template: Template) {
        const { id } = template;
        if (!this.workbooks[id]) throw new Error(i18n.t("Template not loaded"));

        return this.workbooks[id];
    }

    private buildRange({ type, ref, sheet }: SheetRef, workbook: ExcelWorkbook) {
        return type === "range"
            ? workbook.sheet(sheet).range(String(ref))
            : workbook.sheet(sheet).range(`${ref}:${ref}`);
    }

    private async listDefinedNames(template: Template): Promise<string[]> {
        const workbook = await this.getWorkbook(template);
        try {
            //@ts-ignore Not typed, need extension
            return workbook.definedName();
        } catch (error) {
            return [];
        }
    }
}
