import { DataSource, GeneratedTemplate, StyleSource } from "../../../domain/entities/Template";

export class OldGenerated01 implements GeneratedTemplate {
    public readonly type = "generated";
    public readonly id = "OLD_GENERATED_v1";
    public readonly name = "Auto-generated dataSet template";
    public readonly dataFormId = { type: "cell" as const, sheet: "Data Entry", ref: "A1" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };

    public readonly rowOffset = 0;
    public readonly colOffset = 0;

    public readonly dataSources: DataSource[] = [];

    public readonly styleSources: StyleSource[] = [];
}
