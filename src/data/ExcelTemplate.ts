import XlsxPopulate from "xlsx-populate";
import { AggregatedPackage } from "../domain/entities/AggregatedPackage";
import { EventsPackage } from "../domain/entities/EventsPackage";
import { DataSetTemplate, DataSource, ProgramTemplate } from "../domain/entities/Template";

class ExcelTemplate {
    protected workbook: XlsxPopulate.Workbook | undefined;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly url: string | undefined,
        public readonly dataSources: DataSource[]
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

    public async toBlob(): Promise<Blob> {
        if (!this.workbook) throw new Error("Failed to read workbook");
        const data = await this.workbook.outputAsync("buffer");
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    public parseData(file: File): void {
        throw new Error("Method not implemented.");
    }
}

export class DataSetExcelJSTemplate extends ExcelTemplate implements DataSetTemplate {
    public readonly type = "dataSet";

    public parseData(file: File): AggregatedPackage {
        throw new Error("Method not implemented.");
    }
}

export class ProgramExcelJSTemplate extends ExcelTemplate implements ProgramTemplate {
    public readonly type = "program";

    public parseData(file: File): EventsPackage {
        throw new Error("Method not implemented.");
    }
}
