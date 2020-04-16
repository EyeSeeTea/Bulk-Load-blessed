import { DataSource, Template } from "../domain/entities/Template";
import XLSX, { Workbook } from "xlsx-populate";

export class XLSXPopulateTemplate implements Template {
    protected workbook: Workbook | undefined;

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
            this.workbook = await XLSX.fromDataAsync(data);
        } else {
            this.workbook = await XLSX.fromBlankAsync();
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
