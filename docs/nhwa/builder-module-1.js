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

let dataSheet4 = [
    ...getDataElements({
        sheet: "Sourcetype",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"],
        dataRowStart: 8,
        type: "input.entrytrueonly",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3, ...dataSheet4];
console.log(result);
