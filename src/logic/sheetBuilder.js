import * as Excel from 'excel4node';
import {saveAs} from 'file-saver';
import _ from 'lodash';

import * as utils from './utils';
import {buildAllPossiblePeriods} from "../utils";

export const SheetBuilder = function (builder) {
    this.workbook = new Excel.Workbook();
    this.builder = builder;

    this.overviewSheet = this.workbook.addWorksheet('Overview');
    this.dataEntrySheet = this.workbook.addWorksheet('Data Entry');
    this.metadataSheet = this.workbook.addWorksheet('Metadata');
    this.validationSheet = this.workbook.addWorksheet('Validation');

    this.addOverviewSheet();
    this.addDataEntrySheet();
    this.addMetadataSheet();
    this.addValidationSheet();
};

SheetBuilder.prototype.downloadSheet = async function () {
    await downloadExcel(this.workbook, this.builder.element.displayName);
};

SheetBuilder.prototype.addOverviewSheet = function () {
    const { elementMetadata: metadata, rawMetadata } = this.builder;
    let overviewSheet = this.overviewSheet;

    // Freeze and format column titles
    overviewSheet.row(2).freeze();
    overviewSheet.column(1).setWidth(50);
    overviewSheet.column(2).setWidth(50);
    overviewSheet.column(3).setWidth(20);
    overviewSheet.column(4).setWidth(20);
    overviewSheet.column(5).setWidth(40);

    // Add column titles
    overviewSheet.cell(1, 1, 2, 1, true).string('Name').style(style);
    overviewSheet.cell(1, 2, 2, 2, true).string('Description').style(style);
    overviewSheet.cell(1, 3, 2, 3, true).string('Value Type').style(style);
    overviewSheet.cell(1, 4, 2, 4, true).string('Option Set').style(style);
    overviewSheet.cell(1, 5, 2, 5, true).string('Possible Values').style(style);

    let rowId = 3;
    rawMetadata["dataElements"].forEach((value, key) => {
        let name = value.formName ? value.formName : value.name;
        let optionSet = value.optionSet ? metadata.get(value.optionSet.id) : null;
        let options = optionSet && optionSet.options ? optionSet.options.map(option => metadata.get(option.id).name).join(', ') : null;

        overviewSheet.cell(rowId, 1).string(name ? name : '');
        overviewSheet.cell(rowId, 2).string(value.description ? value.description : '');
        overviewSheet.cell(rowId, 3).string(value.valueType ? value.valueType : '');
        overviewSheet.cell(rowId, 4).string(optionSet ? optionSet.name : '');
        overviewSheet.cell(rowId, 5).string(options ? options : '');

        rowId++;
    });
};

SheetBuilder.prototype.addDataEntrySheet = function () {
    const { element, elementMetadata: metadata} = this.builder;
    let dataEntrySheet = this.dataEntrySheet;

    // Freeze and format column titles
    dataEntrySheet.row(2).freeze();
    dataEntrySheet.row(1).setHeight(30);
    dataEntrySheet.row(2).setHeight(50);

    // Add column titles
    let columnId = 1;
    let groupId = 0;

    // TODO: Do not hard-code OrgUnit fetching
    createColumn(dataEntrySheet, columnId++, 'Org Unit', '=Validation!$A$3:$A$1048576');
    if (element.type === 'program') {
        createColumn(dataEntrySheet, columnId++, 'Latitude');
        createColumn(dataEntrySheet, columnId++, 'Longitude');
    } else if (element.type === 'dataSet') {
        createColumn(dataEntrySheet, columnId++, 'Period', '=Validation!$B$3:$B$1048576');
        createColumn(dataEntrySheet, columnId++, 'Options', '=Validation!$C$3:$C$1048576');
    }

    if (element.type === 'dataSet') {
        let categoryOptionCombos = [];
        for (let [, value] of metadata) {
            if (value.type === 'categoryOptionCombo') {
                categoryOptionCombos.push(value);
            }
        }

        let sections = _.groupBy(categoryOptionCombos, 'categoryCombo.id');
        _.forOwn(sections, (ownSection, categoryComboId) => {
            let categoryCombo = metadata.get(categoryComboId);
            if (categoryCombo.code !== 'default') {
                let dataElementLookup = _.filter(element.dataSetElements, {categoryCombo: { id: categoryComboId}});
                _.forEach(dataElementLookup, lookupResult => {
                    let firstColumnId = columnId;

                    let dataElementId = lookupResult.dataElement.id;
                    let sectionCategoryOptionCombos = sections[categoryComboId];
                    _.forEach(sectionCategoryOptionCombos, dataValue => {
                        dataEntrySheet.column(columnId).setWidth(dataValue.name.length / 2.5 + 10);
                        dataEntrySheet.cell(2, columnId)
                        .formula('_' + dataValue.id)
                        .style(groupStyle(groupId));

                        if (dataValue.description !== undefined) {
                            dataEntrySheet.cell(2, columnId).comment(dataValue.description, {
                                height: '100pt',
                                width: '160pt'
                            });
                        }

                        columnId++;
                    });

                    dataEntrySheet.cell(1, firstColumnId, 1, columnId - 1, true)
                    .formula('_' + dataElementId)
                    .style(groupStyle(groupId));

                    groupId++;
                });
            }
        });
    } else {
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
                    dataEntrySheet.column(columnId).setWidth(dataElement.name.length / 2.5 + 10);
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
};

SheetBuilder.prototype.addMetadataSheet = function () {
    const { elementMetadata: metadata, organisationUnits } = this.builder;
    let metadataSheet = this.metadataSheet;

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
    metadataSheet.cell(1, 4, 2, 4, true).string('Value Type').style(style);
    metadataSheet.cell(1, 5, 2, 5, true).string('Option Set').style(style);
    metadataSheet.cell(1, 6, 2, 6, true).string('Possible Values').style(style);

    let rowId = 3;
    metadata.forEach((value, key) => {
        let name = value.formName !== undefined ? value.formName : value.name;
        let optionSet = value.optionSet ? metadata.get(value.optionSet.id) : null;
        let options = optionSet && optionSet.options ? optionSet.options.map(option => metadata.get(option.id).name).join(', ') : null;

        metadataSheet.cell(rowId, 1).string(value.id ? value.id : '');
        metadataSheet.cell(rowId, 2).string(value.type ? value.type : '');
        metadataSheet.cell(rowId, 3).string(name ? name : '');
        metadataSheet.cell(rowId, 4).string(value.valueType ? value.valueType : '');
        metadataSheet.cell(rowId, 5).string(optionSet ? optionSet.name : '');
        metadataSheet.cell(rowId, 6).string(options ? options : '');

        if (name !== undefined) this.workbook.definedNameCollection.addDefinedName({
            refFormula: "'Metadata'!$" + Excel.getExcelAlpha(3) + '$' + rowId,
            name: '_' + value.id
        });

        rowId++;
    });

    organisationUnits.forEach(orgUnit => {
        metadataSheet.cell(rowId, 1).string(orgUnit.id !== undefined ? orgUnit.id : '');
        metadataSheet.cell(rowId, 2).string('organisationUnit');
        metadataSheet.cell(rowId, 3).string(orgUnit.displayName !== undefined ? orgUnit.displayName : '');

        if (orgUnit.displayName !== undefined) this.workbook.definedNameCollection.addDefinedName({
            refFormula: "'Metadata'!$" + Excel.getExcelAlpha(3) + '$' + rowId,
            name: '_' + orgUnit.id
        });

        rowId++;
    });
};

SheetBuilder.prototype.addValidationSheet = function () {
    const { organisationUnits, element, rawMetadata, elementMetadata, startYear, endYear } = this.builder;
    const title = element.displayName;

    let validationSheet = this.validationSheet;

    // Freeze and format column titles
    validationSheet.row(2).freeze();
    //validationSheet.column(1).setWidth(70);
    //validationSheet.column(2).setWidth(30);
    //validationSheet.column(3).setWidth(30);

    // Add column titles
    let rowId = 1;
    let columnId = 1;
    validationSheet.cell(rowId, columnId, rowId, 3, true).string(title).style(style);

    rowId = 2;
    columnId = 1;
    validationSheet.cell(rowId++, columnId).string('Organisation Units');
    _.forEach(organisationUnits, orgUnit => {
        validationSheet.cell(rowId++, columnId).formula('_' + orgUnit.id);
    });

    if (element.type === 'dataSet') {
        rowId = 2;
        columnId++;
        validationSheet.cell(rowId++, columnId).string('Periods');
        buildAllPossiblePeriods(element.periodType, startYear, endYear).forEach(period => {
            if (isNaN(period)) {
                validationSheet.cell(rowId++, columnId).string(period);
            } else {
                validationSheet.cell(rowId++, columnId).number(Number(period));
            }
        });
    }

    rowId = 2;
    columnId++;
    validationSheet.cell(rowId++, columnId).string('Options');
    let dataSetOptionComboId = element.categoryCombo.id;
    elementMetadata.forEach(e => {
        if (e.type === 'categoryOptionCombo' && e.categoryCombo.id === dataSetOptionComboId) {
            validationSheet.cell(rowId++, columnId).formula('_' + e.id);
        }
    });

    _.forEach(rawMetadata.optionSets, optionSet => {
        rowId = 2;
        columnId++;

        validationSheet.cell(rowId++, columnId).formula('_' + optionSet.id);
        _.forEach(optionSet.options, option => {
            validationSheet.cell(rowId++, columnId).formula('_' + option.id);
        });
    });
};

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
        errorStyle: 'warning',
        showDropDown: true,
        sqref: Excel.getExcelAlpha(columnId) + '3:' + Excel.getExcelAlpha(columnId) + '1048576',
        formulas: [validation.toString()],
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
