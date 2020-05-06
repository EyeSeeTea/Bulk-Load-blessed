import { DataSource, GeneratedTemplate, StyleSource } from "../../domain/entities/Template";

export default class implements GeneratedTemplate {
    public readonly id = "PROGRAM_GENERATED_v0";
    public readonly name = "Auto-generated program template";

    public readonly rowOffset = 0;
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
                ref: "E",
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

    public writeId(id: string | number): string | number {
        return `=_${id}`;
    }

    public readId(string: string | number): string | number {
        return String(string).replace(/[^a-zA-Z0-9]/g, "");
    }
}
