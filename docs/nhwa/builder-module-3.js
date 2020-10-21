// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await (await fetch("/who-prod/api/dataSets/pZ3XRBi9gYE/metadata.json")).json();

let metadata = new Map();

for (let type in rawMetadata) {
    let elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let defaultSheet = "Regulation";
let orgUnitCell = "X2";
let periodCell = "M4";

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
        sheet: "Regulation",
        tabSelector: "#tab0",
        letters: ["F", "G", "H"],
        dataRowStart: 7,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Regulation",
        tabSelector: "#tab0",
        letters: ["I"],
        dataRowStart: 7,
        type: "textarea",
    }),
];

let dataSheet2 = [
    ...getDataElements({
        sheet: "Acreditation",
        tabSelector: "#tab1",
        letters: [
            "F",
            "G",
            "H",
            "L",
            "M",
            "N",
            "R",
            "S",
            "T",
            "X",
            "Y",
            "Z",
            "AD",
            "AE",
            "AF",
            "AJ",
            "AK",
            "AL",
        ],
        dataRowStart: 7,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Acreditation",
        tabSelector: "#tab1",
        letters: ["I", "O", "U", "AA", "AG", "AM"],
        dataRowStart: 7,
        type: "textarea",
    }),
];

let dataSheet3 = [
    ...getDataElements({
        sheet: "Lifelong Learning",
        tabSelector: "#tab2",
        letters: ["F", "G", "H", "L", "M", "N"],
        dataRowStart: 7,
        type: "input.entrytrueonly",
    }),
    ...getDataElements({
        sheet: "Lifelong Learning",
        tabSelector: "#tab2",
        letters: ["I", "O"],
        dataRowStart: 7,
        type: "textarea",
    }),
];

let result = [...dataSheet1, ...dataSheet2, ...dataSheet3];
console.log(result);
