import { CustomTemplateWithUrl, DataSource, StyleSource } from "../../../domain/entities/Template";

export class NRCModule implements CustomTemplateWithUrl {
    public readonly type = "custom";
    public readonly id = "NRCmodule_v1";
    public readonly name = "NRCModule";
    public readonly description = "";
    public readonly url = "templates/NRCModule.xlsx";
    public readonly dataFormId = { type: "value" as const, id: "XXXX" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };
    
    public readonly fixedPeriod = {
        type: "cell" as const,
        sheet: "Data Entry",
        ref: "D4",
    };

    public readonly dataSources: DataSource[] = [
        {
            type: "row",
            orgUnit: { sheet: "Data Entry", type: "column", ref: "B" },
            period: this.fixedPeriod,
            dataElement: { sheet: "Data Entry", type: "column", ref: "C" },
            categoryOption: { sheet: "Data Entry", type: "column", ref: "D" },
            attribute: { sheet: "Data Entry", type: "column", ref: "G" },
            range: { sheet: "Data Entry", rowStart: 4, columnStart: "F", columnEnd: "G" },
        }


    ];

    public readonly styleSources: StyleSource[] = [];
}
