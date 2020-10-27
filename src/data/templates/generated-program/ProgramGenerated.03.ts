import { DataSource, GeneratedTemplate, StyleSource } from "../../../domain/entities/Template";

export class ProgramGenerated03 implements GeneratedTemplate {
    public readonly type = "generated";
    public readonly id = "PROGRAM_GENERATED_v3";
    public readonly name = "Auto-generated program template";
    public readonly dataFormId = { type: "cell" as const, sheet: "Data Entry", ref: "A4" };
    public readonly dataFormType = { type: "value" as const, id: "programs" as const };

    public readonly rowOffset = 3;
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
                rowStart: 6,
                columnStart: "G",
            },
            dataElement: {
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
