import { DataSource, GeneratedTemplate, StyleSource } from "../../domain/entities/Template";

export class TrackerProgramGenerated01 implements GeneratedTemplate {
    public readonly type = "generated";
    public readonly id = "TRACKER_PROGRAM_GENERATED_v1";
    public readonly name = "Auto-generated Tracker Program template v1";
    public readonly dataFormId = { type: "cell" as const, sheet: "Data Entry", ref: "A4" };
    public readonly dataFormType = { type: "value" as const, id: "programs" as const };

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
            enrollmentDate: {
                sheet: "TEI Instances",
                type: "column",
                ref: "C",
            },
            incidentDate: {
                sheet: "TEI Instances",
                type: "column",
                ref: "D",
            },
            attributes: {
                sheet: "TEI Instances",
                rowStart: 6,
                columnStart: "E",
            },
        },
        {
            type: "rowTeiRelationship",
            range: {
                sheet: "Relationships",
                rowStart: 2,
                columnStart: "A",
            },
            typeName: {
                sheet: "Relationships",
                type: "column",
                ref: "A",
            },
            from: {
                sheet: "Relationships",
                type: "column",
                ref: "B",
            },
            to: {
                sheet: "Relationships",
                type: "column",
                ref: "C",
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
                attributeOptionCombo: {
                    sheet,
                    type: "column",
                    ref: "B",
                },
                eventId: {
                    sheet,
                    type: "column",
                    ref: "C",
                },
                date: {
                    sheet,
                    type: "column",
                    ref: "D",
                },
                range: {
                    sheet,
                    rowStart: 3,
                    columnStart: "E",
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
