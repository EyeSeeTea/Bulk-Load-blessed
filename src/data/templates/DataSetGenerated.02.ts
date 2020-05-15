import { DataSource, GeneratedTemplate, StyleSource } from "../../domain/entities/Template";

export default class implements GeneratedTemplate {
    public readonly id = "DATASET_GENERATED_v2";
    public readonly name = "Auto-generated dataSet template";

    public readonly rowOffset = 3;
    public readonly colOffset = 0;

    public readonly dataSources: DataSource[] = [
        {
            type: "row",
            orgUnit: {
                sheet: "Data Entry",
                type: "column",
                ref: "A",
            },
            period: {
                sheet: "Data Entry",
                type: "column",
                ref: "B",
            },
            attribute: {
                sheet: "Data Entry",
                type: "column",
                ref: "C",
            },
            range: {
                sheet: "Data Entry",
                rowStart: 6,
                columnStart: "D",
            },
            dataElement: {
                sheet: "Data Entry",
                type: "row",
                ref: 4,
            },
            categoryOption: {
                sheet: "Data Entry",
                type: "row",
                ref: 5,
            },
        },
    ];

    public readonly styleSources: StyleSource[] = [
        {
            section: "title",
            source: {
                type: "range",
                ref: "D2:I2",
                sheet: "Data Entry",
            },
        },
        {
            section: "subtitle",
            source: {
                type: "range",
                ref: "D3:I3",
                sheet: "Data Entry",
            },
        },
        {
            section: "logo",
            source: {
                type: "range",
                ref: "A2:C3",
                sheet: "Data Entry",
            },
        },
    ];
}
