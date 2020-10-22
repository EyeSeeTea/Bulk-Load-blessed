// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/ZRsZdd2AvAR/metadata.json")).json();

let metadata = new Map();

let customRowsTab1 = [
    {
        row: 8,
        nrOfElements: 3,
    },
    {
        row: 12,
        nrOfElements: 1,
    },
    {
        row: 16,
        nrOfElements: 4,
    },
    {
        row: 20,
        nrOfElements: 3,
    },
];

for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let getDataElements = ({
    sheet,
    orgUnitCell,
    periodCell,
    tabSelector,
    letters,
    dataRowStart,
    type = "input.entryfield",
}) => {
    return Array.from(document.querySelector(tabSelector).querySelectorAll(`${type}`)).map(
        (input, i) => {
            let id = input.getAttribute("id");
            let [dataElement, categoryOptionCombo] = id.split("-");

            return {
                type: "cell",
                orgUnit: { sheet, type: "cell", ref: orgUnitCell },
                period: { sheet, type: "cell", ref: periodCell },
                dataElement: { type: "value", id: dataElement },
                categoryOption: { type: "value", id: categoryOptionCombo },
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
    orgUnitCell,
    periodCell,
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
            let availableLetters = letters.slice(-row.nrOfElements);

            fields.push({
                type: "cell",
                orgUnit: { sheet, type: "cell", ref: orgUnitCell },
                period: { sheet, type: "cell", ref: periodCell },
                dataElement: { type: "value", id: dataElement },
                categoryOption: { type: "value", id: categoryOptionCombo },
                ref: {
                    type: "cell",
                    sheet,
                    ref: `${availableLetters[i]}${row.row}`,
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
        sheet: "Expenditure",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G"],
        rows: customRowsTab1,
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Remuneration",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "G", "H", "I"],
        dataRowStart: 10,
    }),
    ...getDataElements({
        sheet: "Remuneration",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab1",
        letters: ["N"],
        dataRowStart: 20,
        type: "input.entryselect[value='true']",
    }),
    ...getDataElements({
        sheet: "Remuneration",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab1",
        letters: ["E"],
        dataRowStart: 20,
        type: "textarea.entryfield",
    }),
];

let result = [...dataSheet1, ...dataSheet2];
console.log(result);
