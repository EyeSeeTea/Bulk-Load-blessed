// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/m5MiTPdlK17/metadata.json")).json();

let metadata = new Map();

for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let defaultSheet = "Input";
let orgUnitCell = "C4";
let periodCell = "L4";

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

let dataSheet1 = [
    ...getDataElements({
        sheet: "Input",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G", "H", "I", "J", "K", "L"],
        dataRowStart: 8,
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Output",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "G", "H", "I", "J", "K"],
        dataRowStart: 8,
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "Institutions",
        tabSelector: "#tab2",
        letters: ["D", "E", "F"],
        dataRowStart: 18,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Institutions",
        tabSelector: "#tab2",
        letters: ["G"],
        dataRowStart: 18,
        type: "textarea.entryfield",
    }),
    ...getDataElements({
        sheet: "Institutions",
        tabSelector: "#tab2",
        letters: ["D", "E", "F"],
        dataRowStart: 8,
    }),
];

let dataSheet4 = [
    ...getDataElements({
        sheet: "Sourcetype",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 8,
        type: "input.entrytrueonly",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3, ...dataSheet4];
console.log(result);
