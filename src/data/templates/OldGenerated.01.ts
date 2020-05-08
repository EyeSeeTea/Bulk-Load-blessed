import { DataSource, GeneratedTemplate, StyleSource } from "../../domain/entities/Template";

export default class implements GeneratedTemplate {
    public readonly id = "OLD_GENERATED_v1";
    public readonly name = "Auto-generated dataSet template";

    public readonly rowOffset = 0;
    public readonly colOffset = 0;

    public readonly dataSources: DataSource[] = [];

    public readonly styleSources: StyleSource[] = [];
}
