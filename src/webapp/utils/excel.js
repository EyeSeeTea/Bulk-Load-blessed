import * as Excel from "excel4node";
import { colors } from "./colors";

export function createColumn(
    workbook,
    sheet,
    rowId,
    columnId,
    label,
    groupId = undefined,
    validation = undefined
) {
    sheet.column(columnId).setWidth(20);
    const cell = sheet.cell(rowId, columnId);
    cell.style(groupId ? groupStyle(groupId) : baseStyle);

    if (label.startsWith("_")) cell.formula(label);
    else cell.string(label);

    if (validation !== undefined) {
        const ref = `${Excel.getExcelAlpha(columnId)}${rowId + 1}:${Excel.getExcelAlpha(
            columnId
        )}1048576`;
        sheet.addDataValidation({
            type: "list",
            allowBlank: true,
            error: "Invalid choice was chosen",
            errorStyle: "warning",
            showDropDown: true,
            sqref: ref,
            formulas: [validation.toString()],
        });

        sheet.addConditionalFormattingRule(ref, {
            type: "expression", // the conditional formatting type
            priority: 1, // rule priority order (required)
            formula:
                "ISERROR(MATCH(" +
                Excel.getExcelAlpha(columnId) +
                +(rowId + 1) +
                "," +
                validation.toString().substr(1) +
                ",0))", // formula that returns nonzero or 0
            style: workbook.createStyle({
                font: {
                    bold: true,
                    color: "FF0000",
                },
            }), // a style object containing styles to apply
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
        password: "Wiscentd2019!",
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
