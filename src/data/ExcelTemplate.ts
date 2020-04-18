import Excel, { Workbook } from "exceljs";
import { AggregatedPackage } from "../domain/entities/AggregatedPackage";
import { EventsPackage } from "../domain/entities/EventsPackage";
import { DataSetTemplate, DataSource, ProgramTemplate } from "../domain/entities/Template";

class ExcelTemplate {
    protected workbook: Workbook;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly url: string | undefined,
        public readonly dataSources: DataSource[]
    ) {
        this.workbook = new Excel.Workbook();
    }

    public async initialize() {
        if (this.url) {
            const response = await fetch(this.url);
            const data = await response.arrayBuffer();
            this.workbook.xlsx.load(data);
        }
    }

    public async toBlob(): Promise<Blob> {
        if (!this.workbook) throw new Error("Failed to read workbook");
        const data = await this.workbook.xlsx.writeBuffer();
        return new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
    }

    public parseData(_file: File): void {
        throw new Error("Method not implemented.");
    }
}

export class DataSetExcelJSTemplate extends ExcelTemplate implements DataSetTemplate {
    public readonly type = "dataSet";

    public parseData(_file: File): AggregatedPackage {
        throw new Error("Method not implemented.");
    }
}

export class ProgramExcelJSTemplate extends ExcelTemplate implements ProgramTemplate {
    public readonly type = "program";

    public parseData(_file: File): EventsPackage {
        throw new Error("Method not implemented.");
    }
}
