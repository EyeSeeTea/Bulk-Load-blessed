import ExcelJS from "exceljs/dist/es5/exceljs.browser";
import fileReaderStream from "filereader-stream";
import dateFormat from "dateformat";

import { stringEquals } from "../utils/strings";

/**
 * Import sheet information
 * @param builder:
 *      - d2: DHIS2 Library
 *      - element: Element to be parsed
 *      - file: File to be imported
 * @returns {Promise<>}
 */
export function readSheet(builder) {
    return new Promise(function(resolve, reject) {
        const workbook = new ExcelJS.Workbook();
        const is = workbook.xlsx.createInputStream();
        const frs = fileReaderStream(builder.file);
        // Read workbook when stream is loaded
        is.on("error", reject);
        is.on("done", () => {
            const dataEntrySheet = workbook.getWorksheet("Data Entry");
            const metadataSheet = workbook.getWorksheet("Metadata");
            // const validationSheet = workbook.getWorksheet("Validation");

            // TODO: Check malformed template (undefined?)

            let columns;
            let stageColumns;
            let dataToImport = {
                dataSet: "",
                completeDate: "",
                orgUnit: "",
                dataValues: [],
            };

            const isProgram = builder.element.type === "program";

            // Iterate over all rows that have values in a worksheet
            dataEntrySheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) stageColumns = row.values;
                else if (rowNumber === 2) columns = row.values;
                else {
                    const result = {
                        dataValues: [],
                    };

                    if (isProgram) {
                        result["program"] = builder.element.id;
                        result["status"] = "COMPLETED";
                    } else {
                        result["dataSet"] = builder.element.id;
                        result["completeDate"] = dateFormat(new Date(), "yyyy-mm-dd");
                    }

                    if (row.values[1] !== undefined) {
                        result.orgUnit = builder.organisationUnits[0].id; //parseMetadataId(metadataSheet, row.values[1]);
                    } else {
                        // TODO: Do not hardcode this
                        result.orgUnit = builder.organisationUnits[0].id; // validationSheet.getCell("A3").formula.substr(1);
                    }

                    // TODO: If latitude and longitude are empty or invalid remove prop
                    if (isProgram && row.values[2] !== undefined && row.values[3] !== undefined)
                        result.coordinate = {
                            latitude: row.values[2],
                            longitude: row.values[3],
                        };

                    if (isProgram && row.values[4] !== undefined) {
                        result.eventDate = dateFormat(new Date(row.values[4]), "yyyy-mm-dd");
                    } else if (isProgram) {
                        return reject(new Error("Event date is empty"));
                    }

                    if (!isProgram && row.values[2] !== undefined) {
                        result.period = row.values[2];
                    }

                    if (!isProgram && row.values[3] !== undefined) {
                        result.attributeOptionCombo = parseMetadataId(metadataSheet, row.values[3]);
                    }
                    // row.eachCell({ includeEmpty: true },(cell, colNumber) => {
                    row.eachCell((cell, colNumber) => {
                        if (isProgram && colNumber > 4) {
                            // TODO: Do not hardcode previous entries
                            const id = columns[colNumber].formula.substr(1);
                            let cellValue = cell.value.toString();

                            // TODO: Check different data types
                            const dataValue = builder.elementMetadata.get(id);
                            if (dataValue.optionSet !== undefined) {
                                const optionSet = builder.elementMetadata.get(
                                    dataValue.optionSet.id
                                );
                                optionSet.options.forEach(optionId => {
                                    const option = builder.elementMetadata.get(optionId.id);
                                    if (stringEquals(cellValue, option.name))
                                        cellValue = option.code;
                                });
                            } else if (dataValue.valueType === "DATE") {
                                cellValue = dateFormat(new Date(cellValue), "yyyy-mm-dd");
                            }
                            result.dataValues.push({ dataElement: id, value: cellValue });
                        } else if (!isProgram && colNumber > 3) {
                            // TODO: Do not hardcode previous entries
                            const column = columns[colNumber];
                            const id = column.formula
                                ? column.formula.substr(1)
                                : dataEntrySheet
                                      .getCell(column.sharedFormula)
                                      .value.formula.substr(1);
                            const stageColumn = stageColumns[colNumber];
                            const dataElementId = stageColumn.formula
                                ? stageColumn.formula.substr(1)
                                : dataEntrySheet
                                      .getCell(stageColumn.sharedFormula)
                                      .value.formula.substr(1);
                            //        let cellValue=""
                            //if (cell.value!=null) { let cellValue = cell.value.toString();}
                            const cellValue = cell.value.toString();
                            const dataValue = builder.elementMetadata.get(id);

                            if (dataValue.type === "categoryOptionCombo") {
                                // TODO: OptionSets in categoryOptionCombos
                                result.dataValues.push({
                                    dataElement: dataElementId,
                                    categoryOptionCombo: id,
                                    value: cellValue,
                                    period: result.period,
                                    orgUnit: result.orgUnit,
                                });
                            } else {
                                result.dataValues.push({
                                    dataElement: id,
                                    value: cellValue,
                                    period: result.period,
                                    orgUnit: result.orgUnit,
                                });
                            }
                        }
                    });

                    if (isProgram) dataToImport.push(result);
                    else {
                        dataToImport = {
                            dataSet: result.dataSet,
                            // "completeDate": result.completeDate,
                            orgUnit: result.orgUnit,
                            dataValues: dataToImport.dataValues.concat(result.dataValues),
                        };
                    }
                }
            });

            resolve(isProgram ? { events: dataToImport } : dataToImport);
        });
        frs.pipe(is);
    });
}

function parseMetadataId(metadataSheet, metadataName) {
    let result = metadataName;
    metadataSheet.eachRow((row, rowNumber) => {
        if (stringEquals(metadataName, row.values[3])) result = row.values[1];
    });
    return result;
}
