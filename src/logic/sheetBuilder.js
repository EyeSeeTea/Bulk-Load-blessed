import * as Excel from "excel4node/source";
import {saveAs} from 'file-saver';
import _ from 'lodash';

import * as utils from './utils';

/**
 * Get User Information
 * @param builder:
 *      - element: Element to be parsed
 *      - elementMetadata: The requested metadata
 * @returns {Promise<>}:
 */
export function buildSheet(builder) {
    return new Promise(function (resolve, reject) {
        let workbook = new Excel.Workbook();

        addDataEntrySheet(workbook, builder.element, builder.elementMetadata);
        addMetadataSheet(workbook, builder.elementMetadata);

        downloadExcel(workbook, builder.element.displayName).then(() => resolve());
    });
}

/**
 * Add a new metadata sheet on the given workbook with the current metadata
 * @param workbook
 * @param metadata
 */
function addMetadataSheet(workbook, metadata) {
    let metadataSheet = workbook.addWorksheet('Metadata');

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
    _.forEach(element.programStages, (programStageT) => {
        let programStage = metadata.get(programStageT.id);
        let commonProperties = [programStage.executionDateLabel, 'Latitude', 'Longitude'];

        _.forEach(commonProperties, label => {
            dataEntrySheet.column(columnId).setWidth(20);
            dataEntrySheet.cell(2, columnId)
                .string(label)
                .style(style);
            columnId++;
        });

        dataEntrySheet.cell(1, columnId - commonProperties.length, 1, columnId - 1, true)
            .string(element.displayName)
            .style(style);

        _.forEach(programStage.programStageSections, (programStageSectionT) => {
            let programStageSection = metadata.get(programStageSectionT.id);
            let firstColumnId = columnId;

            let groupStyle = {
                ...style,
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    fgColor: utils.colors[groupId % utils.colors.length]
                }
            };

            _.forEach(programStageSection.dataElements, (dataElementT) => {
                let dataElement = metadata.get(dataElementT.id);

                // TODO: Add column groups
                dataEntrySheet.column(columnId).setWidth(dataElement.formName.length / 2.5 + 10);
                dataEntrySheet.cell(2, columnId)
                    .formula('_' + dataElement.id)
                    .style(groupStyle);

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
                .style(groupStyle);

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
        workbook.writeToBuffer().then(function(data) {
            const blob = new Blob([data], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
            saveAs(blob, title + '.xlsx');
            resolve();
        }).catch(reason => reject(reason));
    });
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
    }
};