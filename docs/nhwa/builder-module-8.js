// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await(await fetch(
    "https://extranet.who.int/dhis2-dev/api/dataSets/p5z7F51v1ag/metadata.json"
)).json();
let metadata = new Map();
for (const type in rawMetadata) {
    const elements = rawMetadata[type];
    if (Array.isArray(elements))
        elements.map(element => metadata.set(element.id, element));
}

let getDataElements = (
    tabSelector,
    letters,
    dataRowStart,
    element = "input",
    type = "entryfield"
) => {
    return Array.from(
        document.querySelector(tabSelector).querySelectorAll(`${element}.${type}`)
    ).map((input, i) => {
        const id = input.getAttribute("id");
        const data = id.split("-");

        return {
            deuid: data[0],
            cocuid: data[1],
            cell_no: `${letters[i % letters.length]}${parseInt(i / letters.length) +
                dataRowStart}`,
            total: false,
            name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`
        };
    });
};

let dataTab2Checks = getDataElements(
    "#tab1",
    ["Q", "R", "S"],
    9,
    "input",
    "entrytrueonly"
);

let dataTab2Comments = getDataElements("#tab1", ["E"], 9, "textarea");

let dataElementsSheet2 = [...dataTab2Checks, ...dataTab2Comments];

let dataTab3Checks = getDataElements(
    "#tab2",
    ["Q", "R", "S"],
    9,
    "input",
    "entrytrueonly"
);

let dataTab3Comments = getDataElements("#tab2", ["E"], 9, "textarea");

let dataElementsSheet3 = [...dataTab3Checks, ...dataTab3Comments];

let sheet2 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 2,
    sheet_name: "M09 - Governance and policies",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "N2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet2
};

let sheet3 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 3,
    sheet_name: "M10 - Information Systems",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "N2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet3
};

let dataElementsTab1 = getDataElements("#tab0", ["D"], 8);

let dataTab1Checks = getDataElements(
    "#tab0",
    ["U", "V", "W"],
    13,
    "input",
    "entrytrueonly"
);

let dataTab1Comments = getDataElements("#tab0", ["E"], 16, "textarea");

let dataTab1OptionSets = getDataElements("#tab0", ["V", "W"], 23, "input", "entryoptionset");

const dataElementsSheet1 = [
    ...dataElementsTab1,
    ...dataTab1Checks,
    ...dataTab1Comments,
    ...dataTab1OptionSets,
];

let sheet1 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 1,
    sheet_name: "M8 - Skill mix composition",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "V2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet1
};

let module810 = {
    name: "Module 8-10 Template",
    file: "NHWA_Module_8_10.xlsx",
    sheets: [sheet1, sheet2, sheet3]
};

JSON.stringify(module810);
