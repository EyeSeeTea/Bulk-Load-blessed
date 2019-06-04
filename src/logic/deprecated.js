/**
 let lockedSheetOptions = {sheetProtection: {
        autoFilter: true, deleteColumns: true, deleteRows: true, password: 'wiscentd', pivotTables: true,
        selectLockedCells: true, selectUnlockedCells: true, sheet: true, sort: true}};
 **/

/**
 function namedValidationToFormula(validation) {
    let result = '=';
    _.forEach(validation, item => {
        result += '_' + item + ';';
    });
    result = result.substr(0, result.length - 1);
    console.log(result);
    return result;
}
 **/