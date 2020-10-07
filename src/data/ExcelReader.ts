import _ from "lodash";
//@ts-ignore
import { WorkBook, WorkSheet } from "xlsx";

export interface Data {
    id: string;
    name: string;
    url: string;
    username: string;
    password: string;
    description?: string;
}

export default class ExcelReader {
    //@ts-ignore
    private readonly config: Config;
    private readonly workbook: WorkBook;
    private readonly metadata: {
        [id: string]: any;
    };

    private warnings: string[] = [];
    //@ts-ignore
    private importObject: DataValueSetImport = {
        dataValues: [],
    };

    //@ts-ignore
    constructor(config: Config, workbook: WorkBook, metadata: any) {
        this.config = config;
        this.workbook = workbook;
        this.metadata = _(metadata)
            .omit(["date", "system"])
            .mapValues((array, metadataType) => array.map((e: object) => ({ ...e, metadataType })))
            .values()
            .flatten()
            .keyBy("id")
            .value();
    }

    //@ts-ignore
    public importExcelFile(): { importObject: DataValueSetImport; warnings: string[] } {
        const { sheets, ignoreTotals: globalIgnoreTotals } = this.config;

        for (const sheetConfig of sheets) {
            const { name: sheetName, orgUnitCell, yearCell, data } = sheetConfig;
            const { cells = [] } = data;

            const ignoreTotals = sheetConfig.ignoreTotals || globalIgnoreTotals || false;

            const sheet = this.workbook.Sheets[sheetName];

            if (!sheet) throw new Error(`Sheet ${sheetName} was not found`);

            // Import individual cell values
            this.importObject.dataValues.push(
                ...cells
                    //@ts-ignore
                    .filter(cell => ignoreTotals && !cell.total)
                    .map(
                        //@ts-ignore
                        (cell): DataValue => ({
                            dataElement: cell.dataElement,
                            categoryOptionCombo: cell.categoryOptionCombo,
                            orgUnit: sheet[orgUnitCell].v,
                            period: sheet[yearCell].v,
                            value: this.formatValue(sheet, cell.address, cell.dataElement),
                        })
                    )
                    //@ts-ignore
                    .filter(dv => dv.value !== undefined)
            );
        }

        return { importObject: this.importObject, warnings: this.warnings };
    }

    private formatValue(sheet: WorkSheet, address: string, dataElementId: string) {
        if (!sheet[address]) return undefined;

        const { v: value } = sheet[address];
        const { valueType, name: dataElementName } = this.metadata[dataElementId];

        if (!valueType) {
            this.warnings.push(
                `Metadata not found for data element ${dataElementId}, ignoring validation`
            );
            return value;
        }

        switch (typeof value) {
            case "boolean":
                if (valueType === "TRUE_ONLY") return value ? value : undefined;
                if (valueType === "BOOLEAN") return value;
                break;
            case "number":
                if (
                    (valueType === "INTEGER" && Number.isInteger(value)) ||
                    (valueType === "INTEGER_POSITIVE" && Number.isInteger(value) && value > 0) ||
                    (valueType === "INTEGER_NEGATIVE" && Number.isInteger(value) && value < 0) ||
                    (valueType === "INTEGER_ZERO_OR_POSITIVE" &&
                        Number.isInteger(value) &&
                        value >= 0) ||
                    (valueType === "PERCENTAGE" &&
                        Number.isInteger(value) &&
                        value >= 0 &&
                        value <= 100) ||
                    valueType === "NUMBER" ||
                    (valueType === "UNIT_INTERVAL" && value >= 0 && value <= 1)
                ) {
                    return value;
                }
                break;
            case "string":
                if (valueType === "TRUE_ONLY" && value.trim().localeCompare("true")) return true;
                if (valueType === "BOOLEAN" && value.trim().localeCompare("true")) return true;
                if (valueType === "BOOLEAN" && value.trim().localeCompare("false")) return false;
                return value;
            case "undefined":
                return value;
        }

        this.warnings.push(
            `Ignoring value "${value}" for data element "${dataElementName} (${dataElementId})". It should be ${valueType}.`
        );
        return undefined;
    }
}
