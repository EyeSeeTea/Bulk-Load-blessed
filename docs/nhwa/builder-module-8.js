// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/p5z7F51v1ag/metadata.json")).json();

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
        sheet: "M8 - Skill mix composition",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["D"],
        dataRowStart: 8,
    }),
    ...getDataElements({
        sheet: "M8 - Skill mix composition",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["U", "V", "W"],
        dataRowStart: 13,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "M8 - Skill mix composition",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["E"],
        dataRowStart: 16,
        type: "textarea",
    }),
    ...getDataElements({
        sheet: "M8 - Skill mix composition",
        orgUnitCell: "V2",
        periodCell: "I4",
        tabSelector: "#tab0",
        letters: ["V", "W"],
        dataRowStart: 23,
        type: "input.entryoptionset",
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "M09 - Governance and policies",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab1",
        letters: ["Q", "R", "S"],
        dataRowStart: 9,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "M09 - Governance and policies",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab1",
        letters: ["E"],
        dataRowStart: 9,
        type: "textarea",
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "M09 - Governance and policies",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab2",
        letters: ["Q", "R", "S"],
        dataRowStart: 9,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "M09 - Governance and policies",
        orgUnitCell: "N2",
        periodCell: "I4",
        tabSelector: "#tab2",
        letters: ["E"],
        dataRowStart: 9,
        type: "textarea",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
