import ExcelJS from 'exceljs/dist/es5/exceljs.browser';
import fileReaderStream from 'filereader-stream';
import dateFormat from 'dateformat';

import {stringEquals} from './utils';

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
        let workbook = new ExcelJS.Workbook();
        let is = workbook.xlsx.createInputStream();
        fileReaderStream(builder.file).pipe(is);
        // Read workbook when stream is loaded
        is.on('done', () => {
            let overviewSheet = workbook.getWorksheet('Overview');
            let dataEntrySheet = workbook.getWorksheet('Data Entry');

            // TODO: Check malformed template (undefined?)

            // Remove first row (contains section stages)
            dataEntrySheet.spliceRows(1, 1);

            let columns;
            let dataToImport = [];

            // Iterate over all rows that have values in a worksheet
            dataEntrySheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) columns = row.values;
                else {
                    let result = {
                        program: builder.element.id,
                        eventDate: dateFormat(new Date(row.values[4]), 'yyyy-mm-dd'), // TODO: If date is undefined error out
                        status: 'COMPLETED',
                        dataValues: []
                    };

                    if (row.values[1] !== undefined) {
                        result.orgUnit = parseMetadataId(workbook, row.values[1]);
                    } else {
                        // TODO: Do not hardcode this
                        result.orgUnit = overviewSheet.getCell('A3').formula.substr(1);
                    }

                    // TODO: If latitude and longitude are empty or invalid remove prop
                    if (row.values[2] !== undefined && row.values[3] !== undefined)
                        result.coordinate = {
                            latitude: row.values[2],
                            longitude: row.values[3]
                    };

                    row.eachCell((cell, colNumber) => {
                        if (colNumber > 4) { // TODO: Do not hardcode previous entries
                            let id = columns[colNumber].formula.substr(1);
                            let cellValue = cell.value.toString();

                            // TODO: Check different data types
                            let dataValue = builder.elementMetadata.get(id);
                            if (dataValue.optionSet !== undefined) {
                                let optionSet = builder.elementMetadata.get(dataValue.optionSet.id);
                                optionSet.options.forEach(optionId => {
                                    let option = builder.elementMetadata.get(optionId.id);
                                    if (stringEquals(cellValue, option.name)) cellValue = option.code;
                                });
                            }

                            result.dataValues.push({dataElement: id, value: cellValue})
                        }
                    });

                    dataToImport.push(result);
                }
            });

            resolve({ events: dataToImport });
        });
    });
}

function parseMetadataId(workbook, metadataName) {
    let result = metadataName;
    workbook.definedNames.model.forEach(definedName => {
        if (definedName.name.startsWith('_')) {
            let id = definedName.name.substr(1);
            let sheetName = definedName.ranges[0].substr(0, definedName.ranges[0].lastIndexOf('!'));
            let reference = definedName.ranges[0].substr(definedName.ranges[0].lastIndexOf('!') + 1);
            if (!reference.includes(':')) {
                let worksheet = workbook.getWorksheet(sheetName);
                let cell = worksheet.getCell(reference.replace('$', ''));
                if (stringEquals(metadataName,cell.value)) result = id;
            }
        }
    });
    return result;
}