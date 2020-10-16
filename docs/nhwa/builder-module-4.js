// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await(await fetch("/who-prod/api/dataSets/HtZb6Cg7TXo/metadata.json")).json();

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
                type: "cell",
                orgUnit: { sheet, type: "cell", ref: orgUnitCell },
                period: { sheet, type: "cell", ref: periodCell },
                dataElement: { type: "value", id: dataElement },
                categoryOption: { type: "value", id: categoryOptionCombo },
                ref: { type: "cell", sheet, ref: `${letters[i % letters.length]}${parseInt(i / letters.length) + dataRowStart}` },
            };
        }
    );
};

let dataSheet1 = [
    ...getDataElements({
        sheet: "Entry into Labour Market",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 9,
    }),
    ...getDataElements({
        sheet: "Entry into Labour Market",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["Q", "R", "S"],
        dataRowStart: 18,
        type: "input.entrytrueonly"
    }), ...getDataElements({
        sheet: "Entry into Labour Market",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["F"],
        dataRowStart: 15,
        type: "textarea"
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Cost per program",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "G", "H", "I"],
        dataRowStart: 10,
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "Lifelong Learning",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab2",
        letters: ["D", "E", "F", "G"],
        dataRowStart: 11,
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
