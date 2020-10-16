// This script is meant to be executed with a window object (JS document)
// You can run it in the Chrome Development Console and retrieve the results in JSON

const rawMetadata = await (
    await fetch("https://extranet.who.int/dhis2-dev/api/dataSets/ZRsZdd2AvAR/metadata.json")
).json();

const metadata = new Map();

const customRows = [
    {
        row: 8,
        nrOfElements: 3,
    },
    {
        row: 12,
        nrOfElements: 1,
    },
    {
        row: 16,
        nrOfElements: 4,
    },
    {
        row: 20,
        nrOfElements: 3,
    },
];

for (const type in rawMetadata) {
    const elements = rawMetadata[type];
    if (Array.isArray(elements)) elements.map(element => metadata.set(element.id, element));
}

function getDataElements(tabSelector, letters, dataRowStart, type = "input.entryfield") {
    return Array.from(document.querySelector(tabSelector).querySelectorAll(type)).map(
        (input, i) => {
            const id = input.getAttribute("id");
            const data = id.split("-");
            return {
                deuid: data[0],
                cocuid: data[1],
                cell_no: `${letters[i % letters.length]}${parseInt(i / letters.length) +
                    dataRowStart}`,
                total: input.disabled,
                name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`,
            };
        }
    );
}

function getDataElementsCustomRows(tabSelector, availableLetters, rows, type = "entryfield") {
    const entryfields = Array.from(
        document.querySelector(tabSelector).querySelectorAll(`input.${type}`)
    );
    let elementCount = 0;
    const allFields = rows.map((row, i) => {
        const fields = [];
        for (i = 0; i < row.nrOfElements; i++) {
            let field = entryfields[elementCount + i];
            let id = field.getAttribute("id");
            let data = id.split("-");
            let letters = availableLetters.slice(-row.nrOfElements);
            fields.push({
                deuid: data[0],
                cocuid: data[1],
                cell_no: `${letters[i]}${row.row}`,
                total: field.disabled,
                name: `${metadata.get(data[0]).name} ${metadata.get(data[1]).name}`,
            });
        }
        elementCount = elementCount + row.nrOfElements;
        return fields;
    });
    return allFields.flat();
}

let dataElementsSheet1 = getDataElementsCustomRows("#tab0", ["D", "E", "F", "G"], customRows);

let sheet1 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 1,
    sheet_name: "Expenditure",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "V2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet1,
};

let dataElementsSheet2 = [
    ...getDataElements("#tab1", ["D", "E", "F", "G", "H", "I"], 10),
    ...getDataElements("#tab1", ["N"], 20, "input.entryselect[value='true']"),
    ...getDataElements("#tab1", ["E"], 20, "textarea.entryfield"),
];

let sheet2 = {
    sheet_type: "AGGREGATE_STATIC",
    sheet_no: 2,
    sheet_name: "Remuneration",
    orgUnitIdScheme: "UID",
    dataElementIdScheme: "UID",
    idScheme: "UID",
    oucode_cell: "N2",
    year_cell: "I4",
    last_data_column: "ZZ",
    agg_des: dataElementsSheet2,
};

const module7 = {
    name: "Module 7 Template",
    file: "NHWA_Module_7.xlsx",
    sheets: [sheet1, sheet2],
};

JSON.stringify(module7, null, 4);
