// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/Tu81BTLUuCT/metadata.json")).json();
let metadata = new Map();
for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let defaultSheet = "Demographic";
let orgUnitCell = "C4";
let periodCell = "Q4";

let sourceTypeRows = _.range(9, 68).filter(row => ![18, 24].includes(row)).map(row => ({ row, nrOfElements: 12 }));
let sourceTypeTotalRows = [8, 18, 24].map(row => ({ row, nrOfElements: 12 }));

let getDataElements = ({
    sheet,
    tabSelector,
    letters,
    dataRowStart,
    type = "input.entryfield",
}) => {
    return Array.from(document.querySelector(tabSelector).querySelectorAll(type)).map(
        (input, i) => {
            let id = input.getAttribute("id");
            let [dataElement, categoryOptionCombo] = id.split("-");

            return {
                type: "cell",
                orgUnit: { sheet: defaultSheet, type: "cell", ref: orgUnitCell },
                period: { sheet: defaultSheet, type: "cell", ref: periodCell },
                dataElement: { type: "value", id: dataElement },
                categoryOption: { type: "value", id: categoryOptionCombo },
                skipPopulate: input.disabled,
                ref: {
                    type: "cell",
                    sheet,
                    ref: `${letters[i % letters.length]}${parseInt(i / letters.length) +
                        dataRowStart}`,
                },
            };
        }
    );
};

let getDataElementsCustomRows = ({
    sheet,
    tabSelector,
    letters,
    rows,
    type = "input.entryfield",
}) => {
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
                skipPopulate: field.disabled,
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
    ...getDataElements({
        sheet: "Demographic",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 8,
    }),
    ...getDataElements({
        sheet: "Demographic",
        tabSelector: "#tab1",
        letters: ["H", "I", "J", "K", "L", "M", "N", "O"],
        dataRowStart: 8,
    }),
    ...getDataElements({
        sheet: "Demographic",
        tabSelector: "#tab2",
        letters: ["P", "Q", "R", "S", "T"],
        dataRowStart: 8,
    }),
    ...getDataElements({
        sheet: "Demographic",
        tabSelector: "#tab0",
        letters: ["B"],
        dataRowStart: 70,
        type: "textarea",
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "OtherDetails",
        tabSelector: "#tab4 div#cde:nth-child(4)",
        letters: ["E", "F", "G", "H", "I", "J", "K", "L", "M"],
        dataRowStart: 13,
    }),
    ...getDataElements({
        sheet: "OtherDetails",
        tabSelector: "#tab4 div#cde:nth-child(2)",
        letters: ["D"],
        dataRowStart: 8,
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "ForeignTrained",
        tabSelector: "#tab3",
        letters: ["D", "E"],
        dataRowStart: 8,
    }),
];

let dataSheet4Values = [
    ...getDataElementsCustomRows({
        sheet: "Sourcetype",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"],
        rows: sourceTypeRows,
        type: "input.entrytrueonly:not(:disabled)",
    }),
];

let dataSheet4Totals = [
    ...getDataElementsCustomRows({
        sheet: "Sourcetype",
        tabSelector: "#tab0",
        letters: ["Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB"],
        rows: sourceTypeTotalRows,
        type: "input.entrytrueonly:disabled",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3, ...dataSheet4Values, ...dataSheet4Totals];
console.log(result);
