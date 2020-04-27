import dateFormat from "dateformat";
import ExcelJS from "exceljs/dist/es5/exceljs.browser";
import fileReaderStream from "filereader-stream";
import _ from "lodash";
import i18n from "../../locales";
import { stringEquals } from "../utils/strings";
import { getObjectVersion } from "./utils";

const models = { dataSet: "dataSets", program: "programs" };

/**
 * Return basic information from sheet.
 * @param file: xlsx file to be imported.
 * @param objectsByType: Object {dataSet, program} containing all D2 objects.
 * @returns {Promise<{object, dataValues}>}
 */
export async function getBasicInfoFromSheet(file, objectsByType, rowOffset) {
    const workbook = await getWorkbook(file);

    const dataEntrySheet = workbook.getWorksheet("Data Entry");
    const metadataSheet = workbook.getWorksheet("Metadata");

    if (!dataEntrySheet) throw new Error("Cannot get data entry sheet");
    if (!metadataSheet) throw new Error("Cannot get metadata sheet");

    const initialRow = 3;

    const object = _(initialRow)
        .range(metadataSheet.rowCount + 1)
        .map(nRow => metadataSheet.getRow(nRow).values)
        .map(values => ({ id: values[1], type: values[2], name: values[3] }))
        .find(item => models[item.type]);

    if (!object) throw new Error("Element not found");

    const pluralName = models[object.type];
    const allObjects = objectsByType[pluralName];

    if (!allObjects) {
        throw new Error(`No data for type: ${object.type}`);
    } else {
        const dbObject =
            _.keyBy(allObjects, "id")[object.id] || _.keyBy(allObjects, "name")[object.name];
        await checkVersion(file, dbObject);
        return { object: dbObject, dataValues: getDataValues(object, dataEntrySheet, rowOffset) };
    }
}

function getDataValues(object, dataEntrySheet, rowOffset = 0) {
    return _(rowOffset + 3)
        .range(dataEntrySheet.rowCount + 1)
        .map(nRow => dataEntrySheet.getRow(nRow))
        .map(row => getDataValuesFromRow(row, object))
        .compact()
        .sortBy("period")
        .value();
}

function getDataValuesFromRow(row, object) {
    const infoByType = {
        dataSet: { periodCol: 2, initialValuesCol: 4 },
        program: { periodCol: 4, initialValuesCol: 5 },
    };
    const info = infoByType[object.type];
    if (!info) return;

    const values = row.values;
    const period = values[info.periodCol];
    if (!period) return;

    const count = _(values).drop(info.initialValuesCol).reject(_.isNil).size();

    return { period, count };
}

function getWorkbook(file) {
    return new Promise(function (resolve, reject) {
        const workbook = new ExcelJS.Workbook();
        const inputStream = workbook.xlsx.createInputStream();
        const readerStream = fileReaderStream(file);
        inputStream.on("error", reject);
        inputStream.on("done", () => resolve(workbook));
        readerStream.pipe(inputStream);
    });
}

/**
 * Import sheet information
 * @param builder:
 *      - d2: DHIS2 Library
 *      - element: Element to be parsed
 *      - file: File to be imported
 * @returns {Promise<>}
 */
export function readSheet(builder) {
    return new Promise(function (resolve, reject) {
        const workbook = new ExcelJS.Workbook();
        const is = workbook.xlsx.createInputStream();
        const frs = fileReaderStream(builder.file);
        // Read workbook when stream is loaded
        is.on("error", reject);
        is.on("done", () => {
            const dataEntrySheet = workbook.getWorksheet("Data Entry");
            const metadataSheet = workbook.getWorksheet("Metadata");
            const validationSheet = workbook.getWorksheet("Validation");

            const isProgram = builder.element.type === "program";
            const rowOffset = builder.rowOffset ?? 0;

            let columns;
            let stageColumns;
            let dataToImport = isProgram
                ? []
                : {
                      dataSet: "",
                      completeDate: "",
                      orgUnit: "",
                      dataValues: [],
                  };

            // Iterate over all rows that have values in a worksheet
            dataEntrySheet.eachRow((row, rowNumber) => {
                if (rowNumber === rowOffset + 1) stageColumns = row.values;
                else if (rowNumber === rowOffset + 2) columns = row.values;
                else if (rowNumber > rowOffset) {
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

                    if (builder.useBuilderOrgUnits) {
                        result.orgUnit = builder.organisationUnits[0].id;
                    } else {
                        if (row.values[1] !== undefined) {
                            result.orgUnit = parseMetadataId(metadataSheet, row.values[1]);
                        } else {
                            result.orgUnit = validationSheet.getCell("A3").formula.substr(1);
                        }
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

                    row.eachCell((cell, colNumber) => {
                        if (isProgram && colNumber > 4) {
                            // TODO: Do not hardcode previous entries
                            const id = columns[colNumber].formula.substr(1);
                            let cellValue = cell.value?.text ?? cell.value?.toString();

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
                            } else if (
                                dataValue.valueType === "BOOLEAN" ||
                                dataValue.valueType === "TRUE_ONLY"
                            ) {
                                cellValue = cellValue === "true" || cellValue === "Yes";
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
                            const cellValue = cell.value?.toString();
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
    metadataSheet.eachRow(row => {
        if (row.values[3] && stringEquals(metadataName, row.values[3])) result = row.values[1];
    });
    return result;
}

export async function getVersion(file) {
    const workbook = await getWorkbook(file);
    const dataEntrySheet = workbook.getWorksheet("Data Entry");

    const cellValue = dataEntrySheet.getCell("A1").value || "";
    return cellValue.replace(/^.*?:/, "").trim();
}

async function checkVersion(file, dbObject) {
    if (!dbObject) return true;

    const sheetVersion = await getVersion(file);
    const dbVersion = getObjectVersion(dbObject);

    if (!dbVersion || sheetVersion === dbVersion) {
        return true;
    } else {
        const msg = i18n.t(
            "Cannot import: Versions do not match (database={{dbVersion}}, file={{sheetVersion}})",
            { dbVersion, sheetVersion, nsSeparator: false }
        );
        throw new Error(msg);
    }
}
