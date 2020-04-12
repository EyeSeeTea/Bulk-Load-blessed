import Excel, { Workbook } from "exceljs";
import { AggregatedPackage } from "../entities/AggregatedPackage";
import { EventsPackage } from "../entities/EventsPackage";
import { DataSetTemplate, DataSource, ProgramTemplate } from "../entities/Template";

class ExcelJSTemplate {
    protected workbook: Workbook;

    constructor(
        readonly id: string,
        readonly name: string,
        readonly url: string | undefined,
        readonly dataSources: DataSource[]
    ) {
        this.workbook = new Excel.Workbook();
    }

    async toBlob(): Promise<Blob> {
        if (!this.url) throw new Error("Attempting to load template without an url");
        const response = await fetch(this.url);
        const data = await response.arrayBuffer();
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    from(file: File): void {
        throw new Error("Method not implemented.");
    }
}

export class DataSetExcelJSTemplate extends ExcelJSTemplate implements DataSetTemplate {
    readonly type = "dataSet";

    from(file: File): AggregatedPackage {
        throw new Error("Method not implemented.");
    }
}

export class ProgramExcelJSTemplate extends ExcelJSTemplate implements ProgramTemplate {
    readonly type = "program";

    from(file: File): EventsPackage {
        throw new Error("Method not implemented.");
    }
}
