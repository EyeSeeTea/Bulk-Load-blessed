// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/pZ3XRBi9gYE/metadata.json")).json();

let metadata = new Map();

for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let defaultSheet = "Regulation";
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
        sheet: "Regulation",
        tabSelector: "#tab0",
        letters: ["D", "E", "F"],
        dataRowStart: 8,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Regulation",
        tabSelector: "#tab0",
        letters: ["G"],
        dataRowStart: 8,
        type: "textarea",
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Acreditation",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "H", "I", "J", "L", "M", "N", "P", "Q", "R", "T", "U", "V", "X", "Y", "Z"],
        dataRowStart: 8,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Acreditation",
        tabSelector: "#tab1",
        letters: ["G", "K", "O", "S", "W", "AA"],
        dataRowStart: 8,
        type: "textarea",
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "Lifelong Learning",
        tabSelector: "#tab2",
        letters: ["D", "E", "F", "H", "I", "J"],
        dataRowStart: 8,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Lifelong Learning",
        tabSelector: "#tab2",
        letters: ["G", "K"],
        dataRowStart: 8,
        type: "textarea",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
