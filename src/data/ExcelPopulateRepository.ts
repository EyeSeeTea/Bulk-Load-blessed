import _ from "lodash";
import XLSX, {
    Cell as ExcelCell,
    FormulaError,
    Workbook as ExcelWorkbook,
    Workbook,
} from "xlsx-populate";
import { CellRef, Range, SheetRef, ValueRef } from "../domain/entities/Template";
import { ThemeStyle } from "../domain/entities/Theme";
import { ExcelRepository, LoadOptions, ExcelValue } from "../domain/repositories/ExcelRepository";
import i18n from "../locales";
import { removeCharacters } from "../utils/string";

export class ExcelPopulateRepository extends ExcelRepository {
    private workbooks: Record<string, ExcelWorkbook> = {};

    public async loadTemplate(options: LoadOptions): Promise<string> {
        const workbook = await this.parseFile(options);
        const id = await this.readCellValue(workbook, { type: "cell", sheet: 0, ref: "A1" });
        if (!id || typeof id !== "string") throw new Error("Invalid id");
        const cleanId = id.replace(/^.*?:/, "").trim();

        this.workbooks[cleanId] = workbook;
        return cleanId;
    }

    private async parseFile(options: LoadOptions): Promise<ExcelWorkbook> {
        switch (options.type) {
            case "url": {
                const response = await fetch(options.url);
                const data = await response.arrayBuffer();
                return XLSX.fromDataAsync(data);
            }
            case "file": {
                return XLSX.fromDataAsync(options.file);
            }
            default: {
                return XLSX.fromBlankAsync();
            }
        }
    }

    public async toBlob(id: string): Promise<Blob> {
        const workbook = await this.getWorkbook(id);
        const data = await workbook.outputAsync();
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    public async findRelativeCell(
        id: string,
        location?: SheetRef,
        cellRef?: CellRef
    ): Promise<CellRef | undefined> {
        const workbook = await this.getWorkbook(id);

        if (location?.type === "cell") {
            const destination = workbook.sheet(location.sheet)?.cell(location.ref);
            if (!destination) return undefined;
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
        id: string,
        cellRef: CellRef,
        value: string | number | boolean
    ): Promise<void> {
        const workbook = await this.getWorkbook(id);
        const mergedCells = await this.buildMergedCells(workbook, cellRef.sheet);
        const definedNames = await this.listDefinedNames(id);
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

    public async readCell(
        id: string,
        cellRef?: CellRef | ValueRef
    ): Promise<ExcelValue | undefined> {
        if (!cellRef) return undefined;
        if (cellRef.type === "value") return cellRef.id;

        const workbook = await this.getWorkbook(id);
        return this.readCellValue(workbook, cellRef);
    }

    private async readCellValue(
        workbook: Workbook,
        cellRef: CellRef
    ): Promise<ExcelValue | undefined> {
        const mergedCells = await this.buildMergedCells(workbook, cellRef.sheet);
        const cell = workbook.sheet(cellRef.sheet).cell(cellRef.ref);
        const { startCell: destination = cell } =
            mergedCells.find(range => range.hasCell(cell)) ?? {};

        const value = destination.value() ?? destination.formula();
        if (value instanceof FormulaError) return "";
        return value;
    }

    public async getCellsInRange(id: string, range: Range): Promise<CellRef[]> {
        const workbook = await this.getWorkbook(id);

        const { sheet, columnStart, rowStart, columnEnd, rowEnd } = range;
        const endCell = workbook.sheet(range.sheet).usedRange()?.endCell();
        const rangeColumnEnd = columnEnd ?? endCell?.columnName() ?? "XFD";
        const rangeRowEnd = rowEnd ?? endCell?.rowNumber() ?? 1048576;

        const rangeCells = workbook
            .sheet(sheet)
            .range(rowStart, columnStart, rangeRowEnd, rangeColumnEnd);

        return rangeCells.cells()[0].map(cell => ({
            type: "cell",
            sheet,
            ref: cell.address(),
        }));
    }

    public async addPicture(id: string, location: SheetRef, file: File): Promise<void> {
        const workbook = await this.getWorkbook(id);

        const { sheet, ref } = location;
        const [from, to] = location.type === "range" ? String(ref).split(":") : [ref, ref];

        // @ts-ignore: This part is not typed (we need to create an extension)
        workbook.sheet(sheet).drawings("logo", file).from(from).to(to);
    }

    public async styleCell(id: string, source: SheetRef, style: ThemeStyle): Promise<void> {
        const workbook = await this.getWorkbook(id);

        const { sheet } = source;
        const { text, bold, italic, fontSize = 12, fontColor, fillColor } = style;
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

                const height = text.split("\n").length * fontSize * 2;
                range.cells().map(([cell]) => cell.row().hidden(false).height(height));
            }
        } catch (error) {
            console.error("Could not apply style", { source, style, error });
        }
    }

    private async buildMergedCells(workbook: Workbook, sheet: string | number) {
        //@ts-ignore
        return Object.keys(workbook.sheet(sheet)._mergeCells).map(key => {
            const range = workbook.sheet(sheet).range(key);
            const startCell = range.startCell();
            const hasCell = (cell: ExcelCell) => range.cells()[0]?.includes(cell);

            return { range, startCell, hasCell };
        });
    }

    private async getWorkbook(id: string) {
        if (!this.workbooks[id]) throw new Error(i18n.t("Template {{id}} not loaded", { id }));
        return this.workbooks[id];
    }

    private buildRange({ type, ref, sheet }: SheetRef, workbook: ExcelWorkbook) {
        return type === "range"
            ? workbook.sheet(sheet).range(String(ref))
            : workbook.sheet(sheet).range(`${ref}:${ref}`);
    }

    private async listDefinedNames(id: string): Promise<string[]> {
        const workbook = await this.getWorkbook(id);
        try {
            //@ts-ignore Not typed, need extension
            return workbook.definedName();
        } catch (error) {
            return [];
        }
    }
}
