import { DataSource, GeneratedTemplate, StyleSource } from "../../../domain/entities/Template";

export class ProgramGenerated02 implements GeneratedTemplate {
    public readonly id = "PROGRAM_GENERATED_v2";
    public readonly name = "Auto-generated program template";

    public readonly rowOffset = 5;
    public readonly colOffset = 2;

    public readonly dataSources: DataSource[] = [
        {
            type: "row",
            orgUnit: {
                sheet: "Data Entry",
                type: "column",
                ref: "A",
            },
            attribute: {
                sheet: "Data Entry",
                type: "column",
                ref: "D",
            },
            eventId: {
                sheet: "Data Entry",
                type: "column",
                ref: "E",
            },
            period: {
                sheet: "Data Entry",
                type: "column",
                ref: "F",
            },
            range: {
                sheet: "Data Entry",
                rowStart: 8,
                columnStart: "G",
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
