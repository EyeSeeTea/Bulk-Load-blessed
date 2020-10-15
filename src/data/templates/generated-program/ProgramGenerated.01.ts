import { DataSource, GeneratedTemplate, StyleSource } from "../../../domain/entities/Template";

export class ProgramGenerated01 implements GeneratedTemplate {
    public readonly type = "generated";
    public readonly id = "PROGRAM_GENERATED_v1";
    public readonly name = "Auto-generated program template";
    public readonly dataFormId = { type: "cell" as const, sheet: "Data Entry", ref: "A6" };
    public readonly dataFormType = { type: "value" as const, id: "programs" as const };

    public readonly rowOffset = 5;
    public readonly colOffset = 1;

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
                ref: "E",
            },
            attribute: {
                sheet: "Data Entry",
                type: "column",
                ref: "D",
            },
            range: {
                sheet: "Data Entry",
                rowStart: 8,
                columnStart: "F",
            },
            dataElement: {
                sheet: "Data Entry",
                type: "row",
                ref: 7,
            },
        },
    ];

    public readonly styleSources: StyleSource[] = [];
}
