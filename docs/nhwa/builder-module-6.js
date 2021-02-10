// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/WDyQKfAvY3V/metadata.json")).json();

let metadata = new Map();

let customRowsTab1 = [
    { row: 8, nrOfElements: 1 },
    { row: 13, nrOfElements: 6 },
    { row: 14, nrOfElements: 6 },
    { row: 15, nrOfElements: 6 },
    { row: 16, nrOfElements: 6 },
    { row: 17, nrOfElements: 6 },
    { row: 18, nrOfElements: 6 },
    { row: 19, nrOfElements: 6 },
];

let customRowsTab2Comments = [
    { row: 9, nrOfElements: 1 },
    { row: 13, nrOfElements: 1 },
    { row: 14, nrOfElements: 1 },
];

let customRowsTab3Comments = [
    { row: 9, nrOfElements: 1 },
    { row: 10, nrOfElements: 1 },
    { row: 11, nrOfElements: 1 },
    { row: 12, nrOfElements: 1 },
    { row: 13, nrOfElements: 1 },
    { row: 14, nrOfElements: 1 },
    { row: 15, nrOfElements: 1 },
    { row: 19, nrOfElements: 1 },
    { row: 23, nrOfElements: 1 },
];

let customRowsTab3YesPartialNo = [
    { row: 9, nrOfElements: 3 },
    { row: 10, nrOfElements: 3 },
    { row: 11, nrOfElements: 3 },
    { row: 12, nrOfElements: 3 },
    { row: 13, nrOfElements: 3 },
    { row: 14, nrOfElements: 3 },
    { row: 15, nrOfElements: 3 },
    { row: 23, nrOfElements: 3 },
];

for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let defaultSheet = "Characteristics";
let orgUnitCell = "C4";
let periodCell = "I4";

let getDataElements = ({ sheet, tabSelector, letters, dataRowStart, type = "input.entryfield" }) => {
    return Array.from(document.querySelector(tabSelector).querySelectorAll(type)).map((input, i) => {
        let id = input.getAttribute("id");
        let [dataElement, categoryOptionCombo] = id.split("-");

        return {
            type: "cell",
            orgUnit: { sheet: defaultSheet, type: "cell", ref: orgUnitCell },
            period: { sheet: defaultSheet, type: "cell", ref: periodCell },
            dataElement: { type: "value", id: dataElement },
            categoryOption: { type: "value", id: categoryOptionCombo },
            ref: {
                type: "cell",
                sheet,
                ref: `${letters[i % letters.length]}${parseInt(i / letters.length) + dataRowStart}`,
            },
        };
    });
};

let getDataElementsCustomRows = ({ sheet, tabSelector, letters, rows, type = "input.entryfield" }) => {
    let entryfields = Array.from(document.querySelector(tabSelector).querySelectorAll(type));
    let elementCount = 0;
    let allFields = rows.map((row, i) => {
        let fields = [];
        for (i = 0; i < row.nrOfElements; i++) {
            let field = entryfields[elementCount + i];
            let id = field.getAttribute("id");
            let [dataElement, categoryOptionCombo] = id.split("-");

            fields.push({
                type: "cell",
                orgUnit: { sheet: defaultSheet, type: "cell", ref: orgUnitCell },
                period: { sheet: defaultSheet, type: "cell", ref: periodCell },
                dataElement: { type: "value", id: dataElement },
                categoryOption: { type: "value", id: categoryOptionCombo },
                ref: {
                    type: "cell",
                    sheet,
                    ref: `${letters[i]}${row.row}`,
                },
            });
        }
        elementCount = elementCount + row.nrOfElements;
        return fields;
    });
    return allFields.flat();
};

let dataSheet1 = [
    ...getDataElementsCustomRows({
        sheet: "Characteristics",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G", "H", "I"],
        rows: customRowsTab1,
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Conditions",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "G", "H"],
        dataRowStart: 18,
    }),
    ...getDataElements({
        sheet: "Conditions",
        tabSelector: "#tab1",
        letters: ["D", "E", "F"],
        dataRowStart: 9,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Conditions",
        tabSelector: "#tab1",
        letters: ["D"],
        dataRowStart: 13,
        type: "input.entryselect[value=true]",
    }),
    ...getDataElementsCustomRows({
        sheet: "Conditions",
        tabSelector: "#tab1",
        letters: ["G"],
        rows: customRowsTab2Comments,
        type: "textarea.entryfield",
    }),
];

let dataSheet3 = [
    ...getDataElementsCustomRows({
        sheet: "Regulation",
        tabSelector: "#tab2",
        letters: ["D", "E", "F"],
        rows: customRowsTab3YesPartialNo,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Regulation",
        tabSelector: "#tab2",
        letters: ["D"],
        dataRowStart: 19,
        type: "input.entryselect[value=true]",
    }),
    ...getDataElementsCustomRows({
        sheet: "Regulation",
        tabSelector: "#tab2",
        letters: ["G"],
        rows: customRowsTab3Comments,
        type: "textarea.entryfield",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
