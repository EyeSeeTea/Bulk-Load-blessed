import dateFormat from "dateformat";
import ExcelJS from "exceljs/dist/es5/exceljs.browser";
import _ from "lodash";
import i18n from "../../locales";
import { stringEquals } from "../utils/strings";
import { getObjectVersion } from "./utils";

// Algorithm based on:
// https://wrf.ecse.rpi.edu//Research/Short_Notes/pnpoly.html

/*
function checkCoordinates(coord, vs) {
    const x = coord.longitude,
        y = coord.latitude;

    for (let l = 0; l < vs.length; ++l) {
        for (let k = 0; k < vs[l].length; ++k) {
            let inside = false;
            for (let i = 0, j = vs[l][k].length - 1; i < vs[l][k].length; j = i++) {
                const xi = vs[l][k][i][0],
                    yi = vs[l][k][i][1];
                const xj = vs[l][k][j][0],
                    yj = vs[l][k][j][1];

                // eslint-disable-next-line
                const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
                if (intersect) inside = !inside;
            }
            if (inside) return true;
        }
    }

    return false;
}
*/

export async function getUsedOrgUnits({ file, useBuilderOrgUnits, organisationUnits, rowOffset = 0 }) {
    const workbook = await getWorkbook(file);
    const dataEntrySheet = workbook.getWorksheet("Data Entry");
    const metadataSheet = workbook.getWorksheet("Metadata");
    const validationSheet = workbook.getWorksheet("Validation");

    const result = {};
    const set = new Set();

    // Iterate over all rows that have values in a worksheet
    dataEntrySheet.eachRow((row, rowNumber) => {
        if (rowNumber > rowOffset + 2) {
            if (useBuilderOrgUnits) {
                result.orgUnit = organisationUnits[0].id;
            } else {
                if (row.values[1] !== undefined) {
                    result.orgUnit = parseMetadataId(metadataSheet, row.values[1].result ?? row.values[1]);
                } else {
                    result.orgUnit = validationSheet.getCell("A3").formula.substr(1);
                }
            }

            set.add(result.orgUnit);
        }
    });
    return set;
}

/**
 * Return basic information from sheet.
 * @param file: xlsx file to be imported.
 * @param objectsByType: Object {dataSet, program} containing all D2 objects.
 * @returns {Promise<{id, type, name}>}
 */
export async function getBasicInfoFromSheet(file) {
    const initialRow = 3;
    const workbook = await getWorkbook(file);

    const dataEntrySheet = workbook.getWorksheet("Data Entry");
    const metadataSheet = workbook.getWorksheet("Metadata");

    if (!dataEntrySheet) throw new Error(i18n.t("Cannot get data entry sheet"));
    if (!metadataSheet) throw new Error(i18n.t("Cannot get metadata sheet"));

    return (
        _(initialRow)
            .range(metadataSheet.rowCount + 1)
            .map(nRow => metadataSheet.getRow(nRow).values)
            .map(values => ({ id: values[1], type: values[2], name: values[3] }))
            .find(item => item.type === "programs" || item.type === "dataSets") ?? {}
    );
}

export async function getDataValues(file, object, rowOffset, colOffset) {
    const workbook = await getWorkbook(file);
    const dataEntrySheet = workbook.getWorksheet("Data Entry");
    if (!dataEntrySheet) throw new Error(i18n.t("Cannot get data entry sheet"));

    return _(rowOffset + 3)
        .range(dataEntrySheet.rowCount + 1)
        .map(nRow => dataEntrySheet.getRow(nRow))
        .map(row => getDataValuesFromRow(row, object, colOffset))
        .compact()
        .sortBy("period")
        .value();
}

function getDataValuesFromRow(row, object, colOffset) {
    const infoByType = {
        dataSets: { periodCol: 2, initialValuesCol: 4 },
        programs: { periodCol: 4, initialValuesCol: 5 },
    };
    const info = infoByType[object.type];
    if (!info) return;

    const values = row.values;
    const period = values[info.periodCol + colOffset];
    if (!period) return;

    const count = _(values)
        .drop(info.initialValuesCol + colOffset)
        .reject(_.isNil)
        .size();

    const id = object.type === "programs" && colOffset > 1 ? values[5] : undefined;

    return { period, count, id };
}

async function getWorkbook(file) {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    return workbook;
}

export async function readSheet({
    file,
    element,
    elementMetadata,
    useBuilderOrgUnits,
    organisationUnits,
    orgUnitCoordMap: _orgUnitCoordMap,
    rowOffset = 0,
    colOffset = 0,
}) {
    const workbook = await getWorkbook(file);
    const dataEntrySheet = workbook.getWorksheet("Data Entry");
    const metadataSheet = workbook.getWorksheet("Metadata");
    const validationSheet = workbook.getWorksheet("Validation");

    const isProgram = element.type === "programs";

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
        if (rowNumber === rowOffset + 1) {
            stageColumns = row.values;
        } else if (rowNumber === rowOffset + 2) {
            columns = row.values;
        } else if (rowNumber > rowOffset) {
            const result = {
                dataValues: [],
            };

            if (isProgram) {
                result["program"] = element.id;
                result["status"] = "COMPLETED";
            } else {
                result["dataSet"] = element.id;
                result["completeDate"] = dateFormat(new Date(), "yyyy-mm-dd");
            }

            if (useBuilderOrgUnits) {
                result.orgUnit = organisationUnits[0].id;
            } else {
                if (row.values[1] !== undefined) {
                    result.orgUnit = parseMetadataId(metadataSheet, row.values[1].result ?? row.values[1]);
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

            /* TODO: Disable temporarily. This code must be refactored:
                - Support API>=2.32 geometry field.
                - Check if row has coordinates.
                - Check orgUnit coordinate type.
            */
            /*
            if (
                isProgram &&
                !checkCoordinates(
                    result.coordinate,
                    JSON.parse(orgUnitCoordMap.get(result.orgUnit).coordinates)
                )
            ) {
                const country = orgUnitCoordMap.get(result.orgUnit)?.displayName ?? "Unknown";
                throw new Error(
                    i18n.t(
                        "Location not valid. Check row number {{rowNumber}} for country {{country}}",
                        { rowNumber, country }
                    )
                );
            }
            */

            if (isProgram && row.values[4 + colOffset] !== undefined) {
                result.eventDate = dateFormat(new Date(row.values[4 + colOffset]), "yyyy-mm-dd");
            } else if (isProgram) {
                throw new Error(i18n.t("Event date is empty"));
            }

            if (!isProgram && row.values[2] !== undefined) {
                result.period = row.values[2];
            }

            // Read attribute option combo
            if (isProgram && colOffset > 0 && row.values[4] !== undefined) {
                // NOTICE: Some old versions of 2.30 appeared to have a bug and required attributeCategoryOptions
                result.attributeOptionCombo = parseMetadataId(metadataSheet, row.values[4], "categoryOptionCombos");
            } else if (!isProgram && row.values[3] !== undefined) {
                result.attributeOptionCombo = parseMetadataId(metadataSheet, row.values[3], "categoryOptionCombos");
            }

            // Read event id
            if (isProgram && colOffset > 1 && row.values[5] !== undefined) {
                result.event = row.values[5];
            }

            row.eachCell((cell, colNumber) => {
                if (isProgram && colNumber > 4 + colOffset) {
                    const id = columns[colNumber].formula.substr(1);
                    const cellValue = getCellValue(cell);

                    const dataElement = elementMetadata.get(id);
                    const value = formatValue({
                        dataElement,
                        cellValue,
                        elementMetadata,
                        metadataSheet,
                    });

                    result.dataValues.push({ dataElement: id, value });
                } else if (!isProgram && colNumber > 3) {
                    const column = columns[colNumber];
                    const id =
                        column.formula?.substr(1) ??
                        dataEntrySheet.getCell(column.sharedFormula).value.formula.substr(1);

                    const stageColumn = stageColumns[colNumber];
                    const dataElementId =
                        stageColumn.formula?.substr(1) ??
                        dataEntrySheet.getCell(stageColumn.sharedFormula).value.formula.substr(1);

                    const { type } = elementMetadata.get(id);
                    const isDisaggregated = type === "categoryOptionCombos";

                    const dataElement = elementMetadata.get(dataElementId);
                    const cellValue = getCellValue(cell);

                    const value = formatValue({
                        dataElement,
                        cellValue,
                        elementMetadata,
                        metadataSheet,
                    });

                    result.dataValues.push({
                        dataElement: isDisaggregated ? dataElementId : id,
                        categoryOptionCombo: isDisaggregated ? id : undefined,
                        value,
                        period: result.period,
                        orgUnit: result.orgUnit,
                        attributeOptionCombo: result.attributeOptionCombo,
                    });
                }
            });

            if (isProgram) dataToImport.push(result);
            else {
                dataToImport = {
                    dataSet: result.dataSet,
                    dataValues: dataToImport.dataValues.concat(result.dataValues),
                };
            }
        }
    });

    return isProgram ? { events: dataToImport, program: element.id } : dataToImport;
}

function getCellValue(cell) {
    return (
        cell.value?.text ??
        cell.value?.result ??
        (cell.type === ExcelJS.ValueType.Formula ? 0 : null) ??
        cell.value?.toString()
    );
}

function formatValue({ dataElement, cellValue, elementMetadata, metadataSheet }) {
    if (dataElement.optionSet !== undefined) {
        const optionId = parseMetadataId(metadataSheet, cellValue, "options");
        const option = elementMetadata.get(optionId);
        return option?.code ?? cellValue;
    } else if (dataElement.valueType === "DATE") {
        return dateFormat(new Date(cellValue), "yyyy-mm-dd");
    } else if (dataElement.valueType === "BOOLEAN" || dataElement.valueType === "TRUE_ONLY") {
        return String(cellValue) === "true" || cellValue === "Yes";
    } else {
        return cellValue;
    }
}

function parseMetadataId(metadataSheet, metadataName, metadataType) {
    let result = metadataName;
    metadataSheet.eachRow(row => {
        const name = metadataName.result ?? metadataName.formula ?? metadataName;
        const hasSameName = row.values[3] && stringEquals(row.values[3], name);
        const hasSameType = !metadataType || stringEquals(row.values[2], metadataType);
        if (hasSameName && hasSameType) result = row.values[1];
    });
    return result;
}

export async function getVersion(file) {
    const workbook = await getWorkbook(file);
    const dataEntrySheet = workbook.getWorksheet("Data Entry");

    const cellValue = dataEntrySheet.getCell("A1").value || "OLD_GENERATED_v1";
    return cellValue.replace(/^.*?:/, "").trim();
}

export async function checkVersion(file, dbObject, type) {
    if (!dbObject) return true;

    const sheetVersion = await getVersion(file, type);
    const dbVersion = getObjectVersion(dbObject);

    if (!dbVersion || sheetVersion === dbVersion) {
        return true;
    } else {
        const msg = i18n.t("Cannot import: Versions do not match (database={{dbVersion}}, file={{sheetVersion}})", {
            dbVersion,
            sheetVersion,
            nsSeparator: false,
        });
        throw new Error(msg);
    }
}
