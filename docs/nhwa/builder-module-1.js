// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/Tu81BTLUuCT/metadata.json")).json();
let metadata = new Map();
for (const type in rawMetadata) {
    const elements = rawMetadata[type];
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
            const id = input.getAttribute("id");
            const [dataElement, categoryOptionCombo] = id.split("-");

            return {
                type: "generic",
                orgUnit: { sheet, type: "cell", ref: orgUnitCell },
                period: { sheet, type: "cell", ref: periodCell },
                dataElement: { type: "value", id: dataElement },
                categoryOption: { type: "value", id: categoryOptionCombo },
                range: {
                    sheet,
                    rowStart: parseInt(i / letters.length) + dataRowStart,
                    rowEnd: parseInt(i / letters.length) + dataRowStart,
                    columnStart: letters[i % letters.length],
                    columnEnd: letters[i % letters.length],
                },
            };
        }
    );
};

let dataSheet1 = [
    ...getDataElements({
        sheet: "Demographic",
        orgUnitCell: "V2",
        periodCell: "Q4",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 8,
    }),
    ...getDataElements({
        sheet: "Demographic",
        orgUnitCell: "V2",
        periodCell: "Q4",
        tabSelector: "#tab1",
        letters: ["H", "I", "J", "K", "L", "M", "N", "O"],
        dataRowStart: 8,
    }),
    ...getDataElements({
        sheet: "Demographic",
        orgUnitCell: "V2",
        periodCell: "Q4",
        tabSelector: "#tab2",
        letters: ["P", "Q", "R", "S", "T"],
        dataRowStart: 8,
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "OtherDetails",
        orgUnitCell: "N2",
        periodCell: "M4",
        tabSelector: "#tab4 div#cde:nth-child(4)",
        letters: ["E", "F", "G", "H", "I", "J", "K", "L", "M"],
        dataRowStart: 13,
    }),
    ...getDataElements({
        sheet: "OtherDetails",
        orgUnitCell: "N2",
        periodCell: "M4",
        tabSelector: "#tab4 div#cde:nth-child(2)",
        letters: ["D"],
        dataRowStart: 8,
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "ForeignTrained",
        orgUnitCell: "Q2",
        periodCell: "O4",
        tabSelector: "#tab3",
        letters: ["D", "E"],
        dataRowStart: 8,
    }),
];

let dataSheet4 = [
    ...getDataElements({
        sheet: "Sourcetype",
        orgUnitCell: "P2",
        periodCell: "M4",
        tabSelector: "#tab0",
        letters: ["P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA"],
        dataRowStart: 8,
        type: "input.entrytrueonly",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3, ...dataSheet4];
console.log(result);
