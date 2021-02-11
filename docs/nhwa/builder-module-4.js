// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/HtZb6Cg7TXo/metadata.json")).json();

let metadata = new Map();

for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let defaultSheet = "Finance";
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

let dataSheet1 = [
    ...getDataElements({
        sheet: "Finance",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 9,
    }),
    ...getDataElements({
        sheet: "Finance",
        tabSelector: "#tab0",
        letters: ["D", "E", "F"],
        dataRowStart: 15,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Finance",
        tabSelector: "#tab0",
        letters: ["G"],
        dataRowStart: 15,
        type: "textarea",
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Cost per program",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "G", "H", "I"],
        dataRowStart: 10,
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "Lifelong Learning",
        tabSelector: "#tab2",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 11,
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
