// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

const rawMetadata = await(await fetch(
    "/api/dataSets/WDyQKfAvY3V/metadata.json"
)).json();

const metadata = new Map();

const customRowsTab1 = [
    { row: 8, nrOfElements: 1 },
    { row: 13, nrOfElements: 6 },
    { row: 14, nrOfElements: 6 },
    { row: 15, nrOfElements: 6 },
    { row: 16, nrOfElements: 6 },
    { row: 17, nrOfElements: 6 },
    { row: 18, nrOfElements: 6 },
    { row: 19, nrOfElements: 6 }
];

const customRowsTab3Comments = [
    { row: 9, nrOfElements: 1 },
    { row: 10, nrOfElements: 1 },
    { row: 11, nrOfElements: 1 },
    { row: 12, nrOfElements: 1 },
    { row: 13, nrOfElements: 1 },
    { row: 14, nrOfElements: 1 },
    { row: 15, nrOfElements: 1 },
    { row: 20, nrOfElements: 1 },
    { row: 21, nrOfElements: 1 }
];

const customRowsTab3YesPartialNo = [
    { row: 9, nrOfElements: 3 },
    { row: 10, nrOfElements: 3 },
    { row: 11, nrOfElements: 3 },
    { row: 12, nrOfElements: 3 },
    { row: 13, nrOfElements: 3 },
    { row: 14, nrOfElements: 3 },
    { row: 15, nrOfElements: 3 },
    { row: 21, nrOfElements: 3 }
];
for (const type in rawMetadata) {
    const elements = rawMetadata[type];
    if (Array.isArray(elements))
        elements.map(element => metadata.set(element.id, element));
}

function getDataElements(
    tabSelector,
    letters,
    dataRowStart,
    type = "input.entryfield"
) {
    return Array.from(
        document.querySelector(tabSelector).querySelectorAll(type)
    ).map((input, i) => {
        const id = input.getAttribute("id");
        const data = id.split("-");
        return {
            deuid: data[0],
            cocuid: data[1],
            cell_no: `${letters[i % letters.length]}${parseInt(i / letters.length) +
                dataRowStart}`,
            total: input.disabled,
            name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`
        };
    });
}

function getDataElementsCustomRows(
    tabSelector,
    letters,
    rows,
    type = "input.entryfield"
) {
    const entryfields = Array.from(
        document.querySelector(tabSelector).querySelectorAll(type)
    );
    let elementCount = 0;
    const allFields = rows.map((row, i) => {
        const fields = [];
        for (i = 0; i < row.nrOfElements; i++) {
            const field = entryfields[elementCount + i];
            const id = field.getAttribute("id");
            const data = id.split("-");
            fields.push({
                deuid: data[0],
                cocuid: data[1],
                cell_no: `${letters[i]}${row.row}`,
                total: field.disabled,
                name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`
            });
        }
        elementCount = elementCount + row.nrOfElements;
        return fields;
    });
    return allFields.flat();
}

const dataElementsSheet1 = getDataElementsCustomRows(
    "#tab0",
    ["D", "E", "F", "G", "H", "I"],
    customRowsTab1
);

const dataElementsSheet2 = [
    ...getDataElements("#tab1", ["D", "E", "F", "G", "H"], 16),
    ...getDataElements("#tab1", ["P", "Q", "R"], 9, "input.entrytrueonly"),
    ...getDataElements("#tab1", ["S"], 10, "input.entryselect[value=true]"),
    ...getDataElements("#tab1", ["E"], 9, "textarea.entryfield")
];

const dataElementsSheet3 = [
    ...getDataElementsCustomRows(
        "#tab2",
        ["P", "Q", "R"],
        customRowsTab3YesPartialNo,
        "input.entrytrueonly"
    ),
    ...getDataElements("#tab2", ["O"], 20, "input.entryselect[value=true]"),
    ...getDataElementsCustomRows(
        "#tab2",
        ["E"],
        customRowsTab3Comments,
        "textarea.entryfield"
    )
];

const sheet1 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 1,
    sheet_name: "Characteristics",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "V2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet1
};

const sheet2 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 2,
    sheet_name: "Conditions",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "N2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet2
};

const sheet3 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 3,
    sheet_name: "Regulation",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "N2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet3
};

const module6 = {
    name: "Module 6 Template",
    file: "NHWA_Module_6.xlsx",
    sheets: [sheet1, sheet2, sheet3]
};

JSON.stringify(module6, null, 4);
