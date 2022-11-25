import XlsxPopulate from "@eyeseetea/xlsx-populate";
import _ from "lodash";
import { assertUnreachable, RecursivePartial } from "../../types/utils";

/* The original sheetBuilder.js used excel4node, we now transition to xlsx-populate.
   Let's define a wrapper that exposes only the used parts. Known limitations of
   upstream xlsx-populate for our use case:

    - Conditional formatting is not supported (used for extra live validation for metadata).
    - Cell comments are not supported, but it has been implemented in our fork.

  Upstream Backlog: https://github.com/dtjohnson/xlsx-populate/blob/master/backlog.md
*/

export class Workbook {
    private isInitialState: boolean;

    private constructor(private xworkbook: XlsxPopulate.Workbook) {
        this.isInitialState = true;
    }

    static async build() {
        const workbook = await XlsxPopulate.fromBlankAsync();
        return new Workbook(workbook);
    }

    /* Accepts column as integer and returns corresponding column reference as alpha */
    static getExcelAlpha(n: number): string {
        if (n === 0) return "";
        const [div, mod] = [Math.floor((n - 1) / 26), (n - 1) % 26];
        return Workbook.getExcelAlpha(div) + String.fromCharCode(65 + mod);
    }

    addWorksheet(name: string, _options?: AddWorksheetOptions) {
        // xlsx defines an initial sheet, re-use when adding our first sheet.
        const firstSheet = this.xworkbook.sheet(0);
        const xsheet = this.isInitialState && firstSheet ? firstSheet.name(name) : this.xworkbook.addSheet(name);
        this.isInitialState = false;

        const sheetProtection = _options?.sheetProtection;
        if (sheetProtection) xsheet.protected(sheetProtection.password, sheetProtection);

        return new Sheet(this, xsheet);
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
        // TODO
    }
}

export class Sheet {
    constructor(public workbook: Workbook, private xsheet: XlsxPopulate.Sheet) {}

    row(rowNumber: number) {
        const row = this.xsheet.row(rowNumber);

        return {
            freeze: () => {
                this.xsheet.freezePanes(0, rowNumber);
            },
            hide: () => {
                row.hidden(true);
            },
            setHeight: (height: number) => {
                row.height(height);
            },
        };
    }

    column(colNumber: number) {
        const column = this.xsheet.column(colNumber);

        return {
            setWidth: (width: number) => {
                column.width(width);
            },
            hide: () => {
                column.hidden(true);
            },
        };
    }

    cell(startRow: number, startColumn: number, endRow?: number, endColumn?: number, isMerged?: boolean) {
        const xcell1 = this.xsheet.cell(startRow, startColumn);
        const xcell2 = this.xsheet.cell(endRow || startRow, endColumn || startColumn);
        const xrange = this.xsheet.range(xcell1, xcell2);

        if (isMerged) xrange.merged(true);

        const cell = {
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

        const xvalidation = {
            ..._.omit(validation, "formulas"),
            formula1: validation.formulas[0],
            formula2: validation.formulas[1] || "String",
        };
        obj.dataValidation(xvalidation);
    }

    addConditionalFormattingRule(_ref: string, _options: object) {
        // Unsupported by xlsx-populate
    }
}

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

type Position = "center";

type Validation = CustomValidation | ListValidation | TextLengthValidation;

interface CustomValidation {
    type: "custom";
    error: string;
    sqref: string;
    formulas: Formulas;
}

interface ListValidation {
    type: "list";
    allowBlank: boolean;
    error: string;
    errorStyle: "warning";
    showDropDown: boolean;
    sqref: string;
    formulas: Formulas;
}

interface TextLengthValidation {
    type: "textLength";
    error: string;
    sqref: string;
    operator: string;
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
