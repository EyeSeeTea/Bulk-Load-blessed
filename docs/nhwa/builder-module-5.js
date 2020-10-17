// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/cxfAcMbSZe1/metadata.json")).json();

let metadata = new Map();

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

let dataSheet1 = [
    ...getDataElements({
        sheet: "Entry into Labour Market",
        orgUnitCell: "X2",
        periodCell: "K4",
        tabSelector: "#tab0",
        letters: ["D", "E", "F", "G", "H", "I", "J", "K", "L"],
        dataRowStart: 9,
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Exit from Labour Market",
        orgUnitCell: "O2",
        periodCell: "J4",
        tabSelector: "#tab1",
        letters: ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M"],
        dataRowStart: 9,
    }),
];

let result = [...dataSheet1, ...dataSheet2];
console.log(result);
