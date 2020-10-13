import { DataSource, GeneratedTemplate, StyleSource } from "../../domain/entities/Template";

export default class implements GeneratedTemplate {
    public readonly id = "TRACKER_PROGRAM_GENERATED_v1";
    public readonly name = "Auto-generated Tracker Program template v1";

    public readonly rowOffset = 3;
    public readonly colOffset = 0;

    public readonly dataSources: DataSource[] = [
        {
            type: "rowTei",
            teiId: {
                sheet: "TEI Instances",
                type: "column",
                ref: "A",
            },
            orgUnit: {
                sheet: "TEI Instances",
                type: "column",
                ref: "B",
            },
            date: {
                sheet: "TEI Instances",
                type: "column",
                ref: "C",
            },
            attributes: {
                sheet: "TEI Instances",
                rowStart: 6,
                columnStart: "D",
            },
        },
        (sheet: string) =>
            isStageSheet(sheet) && {
                type: "rowTrackedEvent",
                teiId: {
                    sheet,
                    type: "column",
                    ref: "A",
                },
                eventId: {
                    sheet,
                    type: "column",
                    ref: "B",
                },
                date: {
                    sheet,
                    type: "column",
                    ref: "C",
                },
                range: {
                    sheet,
                    rowStart: 3,
                    columnStart: "D",
                },
                dataElement: {
                    sheet,
                    type: "row",
                    ref: 2,
                },
            },
    ];

    public readonly styleSources: StyleSource[] = [
        {
            section: "title",
            source: {
                type: "range",
                ref: "D2:I2",
                sheet: "TEI Instances",
            },
        },
        {
            section: "subtitle",
            source: {
                type: "range",
                ref: "D3:I3",
                sheet: "TEI Instances",
            },
        },
        {
            section: "logo",
            source: {
                type: "range",
                ref: "A2:C3",
                sheet: "TEI Instances",
            },
        },
    ];
}

function isStageSheet(name: string): boolean {
    return name.startsWith("Stage");
}
