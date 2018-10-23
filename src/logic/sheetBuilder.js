import * as Excel from 'excel4node/source';
import {saveAs} from 'file-saver';
import _ from 'lodash';

import * as utils from './utils';

/**
 * Get User Information
 * @param builder:
 *      - element: Element to be parsed
 *      - elementMetadata: The requested metadata
 *      - organisationUnits: Organisation Units to be imported
 * @returns {Promise<>}:
 */
export function buildSheet(builder) {
    return new Promise(function (resolve, reject) {
        let workbook = new Excel.Workbook();

        console.log(builder)

        addOverviewSheet(workbook, builder.element.displayName, builder.organisationUnits);
        addDataEntrySheet(workbook, builder.element, builder.elementMetadata);
        addMetadataSheet(workbook, builder.elementMetadata, builder.organisationUnits);

        downloadExcel(workbook, builder.element.displayName).then(() => resolve());
    });
}

function addOverviewSheet(workbook, title, organisationUnits) {
    let overviewSheet = workbook.addWorksheet('Overview', lockedSheetOptions);

    // Freeze and format column titles
    overviewSheet.row(2).freeze();
    overviewSheet.column(1).setWidth(70);
    overviewSheet.column(2).setWidth(30);
    overviewSheet.column(3).setWidth(30);

    // Add column titles
    // TODO: Freeze 2 fix
    overviewSheet.cell(1, 1, 1, 3, true).string(title).style(style);
    overviewSheet.cell(2, 1).string('Organisation Units').style(style);

    let rowId = 3;
    _.forEach(organisationUnits, orgUnit => {
        overviewSheet.cell(rowId++, 1).formula('_' + orgUnit.id);
    });
}

/**
 * Add a new metadata sheet on the given workbook with the current metadata
 * @param workbook
 * @param metadata
 * @param organisationUnits
 */
function addMetadataSheet(workbook, metadata, organisationUnits) {
    let metadataSheet = workbook.addWorksheet('Metadata', lockedSheetOptions);

    // Freeze and format column titles
    metadataSheet.row(2).freeze();
    metadataSheet.column(1).setWidth(30);
    metadataSheet.column(2).setWidth(30);
    metadataSheet.column(3).setWidth(70);

    // Add column titles
    // TODO: Freeze 2 fix
    metadataSheet.cell(1, 1, 2, 1, true).string('Identifier').style(style);
    metadataSheet.cell(1, 2, 2, 2, true).string('Type').style(style);
    metadataSheet.cell(1, 3, 2, 3, true).string('Name').style(style);

    let rowId = 3;
    metadata.forEach((value, key) => {
        let name = value.formName !== undefined ? value.formName : value.name;

        metadataSheet.cell(rowId, 1).string(value.id !== undefined ? value.id : '');
        metadataSheet.cell(rowId, 2).string(value.type !== undefined ? value.type : '');
        metadataSheet.cell(rowId, 3).string(name !== undefined ? name : '');

        if (name !== undefined) workbook.definedNameCollection.addDefinedName({
            refFormula: "'Metadata'!$" + Excel.getExcelAlpha(3) + '$' + rowId,
            name: '_' + value.id
        });

        rowId++;
    });

    organisationUnits.forEach(orgUnit => {
        metadataSheet.cell(rowId, 1).string(orgUnit.id !== undefined ? orgUnit.id : '');
        metadataSheet.cell(rowId, 2).string('organisationUnit');
        metadataSheet.cell(rowId, 3).string(orgUnit.displayName !== undefined ? orgUnit.displayName : '');

        if (orgUnit.displayName !== undefined) workbook.definedNameCollection.addDefinedName({
            refFormula: "'Metadata'!$" + Excel.getExcelAlpha(3) + '$' + rowId,
            name: '_' + orgUnit.id
        });

        rowId++;
    });
}

/**
 * Add a new data entry sheet on the given workbook with the current metadata
 * @param workbook
 * @param element
 * @param metadata
 */
function addDataEntrySheet(workbook, element, metadata) {
    let dataEntrySheet = workbook.addWorksheet('Data Entry');

    // Freeze and format column titles
    dataEntrySheet.row(2).freeze();
    dataEntrySheet.row(1).setHeight(30);
    dataEntrySheet.row(2).setHeight(50);

    // Add column titles
    let columnId = 1;
    let groupId = 0;

    // TODO: Do not hard-code OrgUnit fetching
    createColumn(dataEntrySheet, columnId++, 'Org Unit', '=Overview!$A$3:$A$1048576');
    createColumn(dataEntrySheet, columnId++, 'Latitude');
    createColumn(dataEntrySheet, columnId++, 'Longitude');

    _.forEach(element.programStages, (programStageT) => {
        let programStage = metadata.get(programStageT.id);

        createColumn(dataEntrySheet, columnId++, programStage.executionDateLabel);

        dataEntrySheet.cell(1, columnId - 1)
            .string(programStage.name)
            .style(style);

        _.forEach(programStage.programStageSections, (programStageSectionT) => {
            let programStageSection = metadata.get(programStageSectionT.id);
            let firstColumnId = columnId;

            _.forEach(programStageSection.dataElements, (dataElementT) => {
                let dataElement = metadata.get(dataElementT.id);
                dataEntrySheet.column(columnId).setWidth(dataElement.formName.length / 2.5 + 10);
                dataEntrySheet.cell(2, columnId)
                    .formula('_' + dataElement.id)
                    .style(groupStyle(groupId));

                if (dataElement.description !== undefined) {
                    dataEntrySheet.cell(2, columnId).comment(dataElement.description, {
                        height: '100pt',
                        width: '160pt'
                    });
                }

                columnId++;
            });

            dataEntrySheet.cell(1, firstColumnId, 1, columnId - 1, true)
                .formula('_' + programStageSection.id)
                .style(groupStyle(groupId));

            groupId++;
        });
    });
}

/**
 * Query a file download of the current workbook with a title
 * @param workbook
 * @param title
 * @returns {Promise<>}
 */
function downloadExcel(workbook, title) {
    return new Promise(function (resolve, reject) {
        workbook.writeToBuffer().then(function (data) {
            const blob = new Blob([data], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
            saveAs(blob, title + '.xlsx');
            resolve();
        }).catch(reason => reject(reason));
    });
}

function createColumn(sheet, columnId, label, validation = undefined) {
    sheet.column(columnId).setWidth(20);
    sheet.cell(2, columnId)
        .string(label)
        .style(style);
    if (validation !== undefined) sheet.addDataValidation({
        type: 'list',
        allowBlank: true,
        error: 'Invalid choice was chosen',
        showDropDown: true,
        sqref: Excel.getExcelAlpha(columnId) + '3:' + Excel.getExcelAlpha(columnId) + '1048576',
        formulas: [validation.toString()],
    });
}

function namedValidationToFormula(validation) {
    let result = '=';
    _.forEach(validation, item => {
        result += '_' + item + ';';
    });
    result = result.substr(0, result.length - 1);
    console.log(result);
    return result;
}

/**
 * Common cell style definition
 * @type {{alignment: {horizontal: string, vertical: string, wrapText: boolean, shrinkToFit: boolean}}}
 */
let style = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true,
        shrinkToFit: true
    },
    fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'ffffff'
    }
};

function groupStyle(groupId) {
    return {
        ...style,
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: utils.colors[groupId % utils.colors.length]
        }
    };
}

let lockedSheetOptions = {sheetProtection: {
        autoFilter: true, deleteColumns: true, deleteRows: true, password: 'wiscentd', pivotTables: true,
        selectLockedCells: true, selectUnlockedCells: true, sheet: true, sort: true}};