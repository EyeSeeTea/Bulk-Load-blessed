import { AggregatedPackage } from "../entities/AggregatedPackage";
import { EventsPackage } from "../entities/EventsPackage";
import { DataSetTemplate, DataSource, ProgramTemplate } from "../entities/Template";
import XlsxPopulate from "xlsx-populate";

class ExcelTemplate {
    protected workbook: XlsxPopulate.Workbook | undefined;

    constructor(
        readonly id: string,
        readonly name: string,
        readonly url: string | undefined,
        readonly dataSources: DataSource[]
    ) {}

    public async initialize() {
        if (this.workbook) {
            return;
        } else if (this.url) {
            const response = await fetch(this.url);
            const data = await response.arrayBuffer();
            this.workbook = await XlsxPopulate.fromDataAsync(data);
        } else {
            this.workbook = await XlsxPopulate.fromBlankAsync();
        }
    }

    async toBlob(): Promise<Blob> {
        if (!this.workbook) throw new Error("Failed to read workbook");
        const data = await this.workbook.outputAsync("buffer");
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    parseData(file: File): void {
        throw new Error("Method not implemented.");
    }
}

export class DataSetExcelJSTemplate extends ExcelTemplate implements DataSetTemplate {
    readonly type = "dataSet";

    parseData(file: File): AggregatedPackage {
        throw new Error("Method not implemented.");
    }
}

export class ProgramExcelJSTemplate extends ExcelTemplate implements ProgramTemplate {
    readonly type = "program";

    parseData(file: File): EventsPackage {
        throw new Error("Method not implemented.");
    }
}
