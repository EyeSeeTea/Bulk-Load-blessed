import { CustomTemplate, DataSource, StyleSource } from "../../../domain/entities/Template";
import { ExcelRepository } from "../../../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../../../domain/repositories/InstanceRepository";

export class SnakebiteAnnualReport implements CustomTemplate {
    public readonly type = "custom";
    public readonly id = "SNAKEBITE_ANNUAL_REPORT_v1";
    public readonly name = "Snakebite Annual Report";
    public readonly url = "templates/Snakebite_Annual_Report.xlsx";
    public readonly dataFormId = { type: "value" as const, id: "XBgvNrxpcDC" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };
    public readonly fixedOrgUnit = {
        type: "cell" as const,
        sheet: "National",
        ref: "B4", // Used for populate
    };
    public readonly fixedPeriod = {
        type: "cell" as const,
        sheet: "National",
        ref: "B5", // Used for populate
    };

    public readonly dataSources: DataSource[] = [];

    public readonly styleSources: StyleSource[] = [];

    public async downloadCustomization(
        excelRepository: ExcelRepository,
        instanceRepository: InstanceRepository
    ): Promise<void> {
        console.log(excelRepository, instanceRepository);
    }
}
