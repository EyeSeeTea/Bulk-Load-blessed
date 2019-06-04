import * as Excel from "excel4node";
import { colors } from "./colors";

export function createColumn(sheet, columnId, label, groupId = undefined, validation = undefined) {
    sheet.column(columnId).setWidth(20);
    const cell = sheet.cell(2, columnId);
    cell.style(groupId ? groupStyle(groupId) : baseStyle);

    if (label.startsWith("_")) cell.formula(label);
    else cell.string(label);

    if (validation !== undefined) {
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
}

/**
 * Common cell style definition
 * @type {{alignment: {horizontal: string, vertical: string, wrapText: boolean, shrinkToFit: boolean}}}
 */
export const baseStyle = {
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
        password: "Wiscentd2019!"
    },
};

export const hiddenSheet = {
    hidden: true,
};

export function groupStyle(groupId) {
    return {
        ...baseStyle,
        fill: {
            type: "pattern",
            patternType: "solid",
            fgColor: colors[groupId % colors.length],
        },
    };
}
