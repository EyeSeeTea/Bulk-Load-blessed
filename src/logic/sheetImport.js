/**
 * Import sheet information
 * @param builder:
 *      - d2: DHIS2 Library
 *      - element: Element to be parsed
 *      - file: File to be imported
 * @returns {Promise<>}
 */
export function importSheet(builder) {

}

/**
let Excel = require('exceljs');
let dateFormat = require('dateformat');

let element = {
    id: 'vFcxda6dJyT',
    type: 'program',
    endpoint: 'programs',
    displayName: 'Chagas disease - Diagnosis (individual data) (HMO16)',
    categoryCombo: {
        id: 'JzvGfLYkX17'
    },
    programStages: [
        {
            id: 'bZyGv5YPlFt'
        }
    ]
};

// read from a file
let workbook = new Excel.Workbook();
workbook.xlsx.readFile('Test.xlsx').then(() => {
    let overviewSheet = workbook.getWorksheet('Overview');
    let dataEntrySheet = workbook.getWorksheet('Data Entry');
    let metadataSheet = workbook.getWorksheet('Metadata');

    // TODO: Check malformed template (undefined?)

    // Remove first row (contains section stages)
    dataEntrySheet.spliceRows(1, 1);

    let columns;

    let dataToImport = [];

    // Iterate over all rows that have values in a worksheet
    dataEntrySheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) columns = row.values;
        else {
            console.log(row.values);
            let result = {
                program: element.id,
                orgUnit: row.values[1], // TODO: If orgUnit is empty error out
                eventDate: dateFormat(new Date(row.values[2]), 'yyyy-mm-dd'), // TODO: If date is undefined error out
                status: 'COMPLETED',
                coordinate: { // TODO: If latitude and longitude are empty or invalid remove prop
                    latitude: row.values[3],
                    longitude: row.values[4]
                },
                dataValues: []
            };

            row.eachCell((cell, colNumber) => {
                if (colNumber > 4) { // TODO: Do not hardcode previous entries
                    let id = columns[colNumber].formula.substr(1);
                    // TODO: Check different data types
                    result.dataValues.push({dataElement: id, value: cell.value.toString()})
                }
            });

            dataToImport.push(result);
        }
    });
});
**/