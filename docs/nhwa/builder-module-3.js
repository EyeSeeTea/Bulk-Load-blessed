// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await(await fetch("/who-prod/api/dataSets/pZ3XRBi9gYE/metadata.json")).json();

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
        sheet: "Regulation",
        orgUnitCell: "X2",
        periodCell: "M4",
        tabSelector: "#tab0",
        letters: ["F", "G", "H"],
        dataRowStart: 7,
        type: "input.entrytrueonly"
    }),
    ...getDataElements({
        sheet: "Regulation",
        orgUnitCell: "X2",
        periodCell: "M4",
        tabSelector: "#tab0",
        letters: ["I"],
        dataRowStart: 7,
        type: "textarea"
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Acreditation",
        orgUnitCell: "AT2",
        periodCell: "P4",
        tabSelector: "#tab1",
        letters: ["F", "G", "H", "L", "M", "N", "R", "S", "T", "X", "Y", "Z", "AD", "AE", "AF", "AJ", "AK", "AL"],
        dataRowStart: 7,
        type: "input.entrytrueonly"
    }),
    ...getDataElements({
        sheet: "Acreditation",
        orgUnitCell: "AT2",
        periodCell: "P4",
        tabSelector: "#tab1",
        letters: ["I", "O", "U", "AA", "AG", "AM"],
        dataRowStart: 7,
        type: "textarea"
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "Lifelong Learning",
        orgUnitCell: "W2",
        periodCell: "Q4",
        tabSelector: "#tab2",
        letters: ["F", "G", "H", "L", "M", "N"],
        dataRowStart: 7,
        type: "input.entrytrueonly"
    }),
    ...getDataElements({
        sheet: "Lifelong Learning",
        orgUnitCell: "W2",
        periodCell: "Q4",
        tabSelector: "#tab2",
        letters: ["I", "O"],
        dataRowStart: 7,
        type: "textarea"
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
