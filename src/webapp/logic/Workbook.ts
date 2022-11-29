import XlsxPopulate from "@eyeseetea/xlsx-populate";
import _ from "lodash";
import { assertUnreachable, RecursivePartial } from "../../types/utils";
import { fromBase64 } from "../../utils/files";

/* The original sheetBuilder.js used excel4node, transition it to xlsx-populate.
   Workbook is a wrapper that implements only what's being use in the builder. 
   Known limitations of upstream xlsx-populate for our use case:

    - Conditional formatting is not supported (used to highlight invalid data).
    - Cell comments are not supported, implemented in fork @eyeseetea/xlsx-populate.

  Upstream Backlog: https://github.com/dtjohnson/xlsx-populate/blob/master/backlog.md
*/

export class Workbook {
    private isInitialState: boolean;

    private constructor(private xworkbook: XlsxPopulate.Workbook) {
        this.isInitialState = true;
    }

    static async empty() {
        const workbook = await XlsxPopulate.fromBlankAsync();
        return new Workbook(workbook);
    }

    static async fromBase64(base64: string) {
        const file = await fromBase64(base64);
        const workbook = await XlsxPopulate.fromDataAsync(file);
        return new Workbook(workbook);
    }

    /* Accepts column as integer and returns corresponding column reference as alpha */
    static getExcelAlpha(n: number): string {
        if (n === 0) return "";
        const columnsRange = 26;
        const charCodeFormUpperA = 65;
        const [div, mod] = [Math.floor((n - 1) / columnsRange), (n - 1) % columnsRange];
        return Workbook.getExcelAlpha(div) + String.fromCharCode(charCodeFormUpperA + mod);
    }

    static getColumnIndex(column: string): number {
        return Array.from(column.toUpperCase()).reduce((acc, char) => {
            return char.charCodeAt(0) - 64 + acc * 26;
        }, 0);
    }

    addWorksheet(name: string, _options?: AddWorksheetOptions) {
        const xsheet = this.getPopulateSheet(name);
        const sheetProtection = _options?.sheetProtection;
        if (sheetProtection) xsheet.protected(sheetProtection.password, sheetProtection);
        return new Sheet(this, xsheet);
    }

    private getPopulateSheet(name: string): XlsxPopulate.Sheet {
        // xlsx-populate defines an initial sheet, re-use it when adding the first sheet.
        const firstSheet = this.xworkbook.sheet(0);
        const existingSheet = this.xworkbook.sheet(name);
        const xsheet =
            this.isInitialState && firstSheet
                ? firstSheet.name(name)
                : existingSheet
                ? existingSheet
                : this.xworkbook.addSheet(name);
        this.isInitialState = false;

        return xsheet;
    }

    writeToBuffer(): Promise<Blob> {
        return this.xworkbook.outputAsync({ type: "blob" });
    }

    get definedNameCollection() {
        return {
            addDefinedName: (options: { name: string; refFormula: string }) => {
                this.xworkbook.definedName(options.name, options.refFormula);
            },
        };
    }

    createStyle(_style: StyleOptions): void {
        // Used only in conditional formatting.
    }
}

export class Sheet {
    constructor(public workbook: Workbook, private xsheet: XlsxPopulate.Sheet) {}

    get name() {
        return this.xsheet.name();
    }

    row(rowNumber: number) {
        const row = this.xsheet.row(rowNumber);

        return {
            setHeight: (height: number) => {
                row.height(height);
                return row;
            },
            freeze: () => {
                this.xsheet.freezePanes(0, rowNumber);
                return row;
            },
            hide: () => {
                row.hidden(true);
                return row;
            },
        };
    }

    column(colNumber: number) {
        const column = this.xsheet.column(colNumber);

        return {
            setWidth: (width: number) => {
                column.width(width);
                return column;
            },
            hide: () => {
                column.hidden(true);
                return column;
            },
        };
    }

    cell(startRow: number, startColumn: number, endRow?: number, endColumn?: number, isMerged?: boolean) {
        const xcell1 = this.xsheet.cell(startRow, startColumn);
        const xcell2 = this.xsheet.cell(endRow || startRow, endColumn || startColumn);
        const xrange = this.xsheet.range(xcell1, xcell2);

        if (isMerged) xrange.merged(true);

        const cell = {
            value: () => {
                return xcell1.value();
            },
            string: (strValue: string) => {
                xrange.value(strValue);
                return cell;
            },
            number: (value: number) => {
                xrange.value(value);
                return cell;
            },
            link: (url: number) => {
                xrange.value(url);
                return cell;
            },
            formula: (formulaValue: string) => {
                xrange.formula(formulaValue);
                return cell;
            },
            comment: (text: string, options: { height: string; width: string }) => {
                xcell1.comment({ text, ...options });
                return cell;
            },
            style: (options: StyleOptions) => {
                const xoptionsBase = {
                    horizontalAlignment: options.alignment?.horizontal,
                    verticalAlignment: options.alignment?.vertical,
                    wrapText: options.alignment?.wrapText,
                    shrinkToFit: options.alignment?.shrinkToFit,
                    fill: getPopulateFill(options.fill),
                    bold: options.font?.bold,
                    fontFamily: "Calibri",
                    fontSize: options.font?.size,
                    fontColor: toPopulateColor(options.font?.color),
                };

                const xoptions = _.omitBy(xoptionsBase, _.isNil);
                xrange.style(xoptions);
                return cell;
            },
        };

        return cell;
    }

    addDataValidation(validation: Validation) {
        // xlsx-populate exposes cell/range data validation, create a range for the whole sheet.
        // https://github.com/dtjohnson/xlsx-populate/issues/273
        const obj = validation.sqref.includes(":")
            ? this.xsheet.range(validation.sqref)
            : this.xsheet.cell(validation.sqref);

        const xvalidation: PopulateDataValidation = {
            type: validation.type,
            allowBlank: validation.allowBlank,
            showInputMessage: validation.showDropDown,
            prompt: "",
            promptTitle: "",
            showErrorMessage: true,
            error: validation.error,
            errorTitle: "",
            errorStyle: validation.errorStyle,
            operator: "",
            formula1: validation.formulas[0],
            formula2: validation.formulas[1] || "",
        };

        obj.dataValidation(xvalidation);
    }

    addConditionalFormattingRule(_ref: string, _options: object) {
        // Unsupported by xlsx-populate
    }
}

type Position = "center";

interface Validation {
    type: "list" | "custom" | "textLength";
    showInputMessage?: boolean;
    allowBlank?: boolean;
    error: string;
    errorStyle?: "warning";
    showDropDown?: boolean;
    operator?: string;
    sqref: string;
    formulas: Formulas;
}

type Formulas = [string] | [string, string];

export type StyleOptions = RecursivePartial<StyleOptions_>;

interface StyleOptions_ {
    alignment: {
        horizontal: Position;
        vertical: Position;
        wrapText: boolean;
        shrinkToFit: boolean;
    };
    fill: {
        type: "pattern";
        patternType: "solid";
        fgColor?: string;
    };
    font: {
        bold: boolean;
        size: number;
        color: string;
    };
}

interface AddWorksheetOptions {
    sheetProtection?: {
        password: string;
        sheet: boolean;
        formatCells: boolean;
        formatColumns: boolean;
        formatRows: boolean;
    };
}

interface PopulateDataValidation {
    type: string;
    allowBlank?: boolean;
    showInputMessage?: boolean;
    prompt: string;
    promptTitle: string;
    showErrorMessage: boolean;
    error: string;
    errorTitle: string;
    operator: string;
    formula1: string;
    formula2: string;
    errorStyle?: string;
}

/* Helper functions */

function getPopulateFill(fill: StyleOptions["fill"]) {
    const type = fill?.type;
    if (!type) return;

    switch (type) {
        case "pattern":
            return {
                type: "solid",
                color: { rgb: toPopulateColor(fill?.fgColor) },
            };
        default:
            assertUnreachable(type);
    }
}

function toPopulateColor(s: string | undefined): string | undefined {
    return s?.replace(/^#/, "");
}
