import * as Excel from "excel4node";
import { colors } from "./colors";

export function createColumn(sheet, columnId, label, validation = undefined) {
    sheet.column(columnId).setWidth(20);
    sheet
        .cell(2, columnId)
        .string(label)
        .style(style);
    if (validation !== undefined)
        sheet.addDataValidation({
            type: "list",
            allowBlank: true,
            error: "Invalid choice was chosen",
            errorStyle: "warning",
            showDropDown: true,
            sqref: Excel.getExcelAlpha(columnId) + "3:" + Excel.getExcelAlpha(columnId) + "1048576",
            formulas: [validation.toString()],
        });
}

/**
 * Common cell style definition
 * @type {{alignment: {horizontal: string, vertical: string, wrapText: boolean, shrinkToFit: boolean}}}
 */
export const style = {
    alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
        shrinkToFit: true,
    },
    fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: "ffffff",
    },
};

export const protectedSheet = {
    sheetProtection: {
        sheet: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
    },
};

export const hiddenSheet = {
    hidden: true,
};

export function groupStyle(groupId) {
    return {
        ...style,
        fill: {
            type: "pattern",
            patternType: "solid",
            fgColor: colors[groupId % colors.length],
        },
    };
}
