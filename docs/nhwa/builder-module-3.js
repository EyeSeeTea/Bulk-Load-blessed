// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

let rawMetadata = await(await fetch("/api/dataSets/pZ3XRBi9gYE/metadata.json")).json();
let metadata = new Map();
for (const type in rawMetadata) {
    const elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

let getDataElements = (tabSelector, letters, dataRowStart, element = "input", type = "entryfield") => {
    return Array.from(document.querySelector(tabSelector).querySelectorAll(`${element}.${type}`)).map((input, i) => {
        const id = input.getAttribute("id");
        const data = id.split("-");

        return {
            deuid: data[0],
            cocuid: data[1],
            cell_no: `${letters[i % letters.length]}${parseInt(i / letters.length) + dataRowStart}`,
            total: false,
            name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`
        };
    });
};

let dataTab0Checks = getDataElements("#tab0", ["F", "G", "H"], 7, "input", "entrytrueonly");

let dataTab0Comments = getDataElements("#tab0", ["I"], 7, "textarea");

let dataElementsSheet1 = [...dataTab0Checks, ...dataTab0Comments]

let sheet1 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 1,
    sheet_name: "Regulation",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "X2",
    year_cell: "M4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet1
};

let dataTab1Checks = getDataElements("#tab1", ["F", "G", "H", "L", "M", "N", "R", "S", "T", "X", "Y", "Z", "AD", "AE", "AF", "AJ", "AK", "AL"], 7, "input", "entrytrueonly");

let dataTab1Comments = getDataElements("#tab1", ["I", "O", "U", "AA", "AG", "AM"], 7, "textarea");

let dataElementsSheet2 = [...dataTab1Checks, ...dataTab1Comments]

let sheet2 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 2,
    sheet_name: "Acreditation",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "AT2",
    year_cell: "P4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet2
};

let dataTab2Checks = getDataElements("#tab2", ["F", "G", "H", "L", "M", "N"], 7, "input", "entrytrueonly");

let dataTab2Comments = getDataElements("#tab2", ["I", "O"], 7, "textarea");

let dataElementsSheet3 = [...dataTab2Checks, ...dataTab2Comments]

let sheet3 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 3,
    sheet_name: "Lifelong Learning",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "W2",
    year_cell: "Q4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet3
};


let module3 = {
    name: "Module 3 Template",
    file: "NHWA_Module_3.xlsx",
    sheets: [sheet1, sheet2, sheet3],
};

JSON.stringify(module3);
