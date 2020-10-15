import { DataSource, GeneratedTemplate, StyleSource } from "../../../domain/entities/Template";

export class DataSetGenerated01 implements GeneratedTemplate {
    public readonly type = "generated";
    public readonly id = "DATASET_GENERATED_v1";
    public readonly name = "Auto-generated dataSet template";
    public readonly dataFormId = { type: "cell" as const, sheet: "Data Entry", ref: "A6" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };

    public readonly rowOffset = 5;
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
                rowStart: 8,
                columnStart: "D",
            },
            dataElement: {
                sheet: "Data Entry",
                type: "row",
                ref: 6,
            },
            categoryOption: {
                sheet: "Data Entry",
                type: "row",
                ref: 7,
            },
        },
    ];

    public readonly styleSources: StyleSource[] = [];
}
