// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await(await fetch("/api/dataSets/cxfAcMbSZe1/metadata.json")).json();
let metadata = new Map();
for (const type in rawMetadata) {
    const elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let getDataElements = (tabSelector, letters, dataRowStart, type = "entryfield") => {
    return Array.from(document.querySelector(tabSelector).querySelectorAll(`input.${type}`)).map((input, i) => {
        const id = input.getAttribute("id");
        const data = id.split("-");

        return {
            deuid: data[0],
            cocuid: data[1],
            cell_no: `${letters[i % letters.length]}${parseInt(i / letters.length) + dataRowStart}`,
            total: input.disabled,
            name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`
        };
    });
};

let dataElementsSheet1 = getDataElements("#tab0", ["D", "E", "F", "G", "H", "I", "J", "K", "L"], 9);

let sheet1 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 1,
    sheet_name: "Entry into Labour Market",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "X2",
    year_cell: "K4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet1
};

let dataElementsSheet2 = getDataElements("#tab1", ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M"], 9);

let sheet2 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 2,
    sheet_name: "Exit from Labour Market",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "O2",
    year_cell: "J4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet2
};

let module5 = {
    name: "Module 5 Template",
    file: "Module_5_Template.xlsx",
    sheets: [sheet1, sheet2],
};

JSON.stringify(module5);
