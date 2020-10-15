import _ from "lodash";
import { promiseMap } from "../../webapp/utils/promises";
import { DataFormType } from "../entities/DataForm";
import { DataPackage, DataValue } from "../entities/DataPackage";
import { CellDataSource, CellRef, SheetRef, Template, ValueRef } from "../entities/Template";
import { ExcelRepository, Value } from "../repositories/ExcelRepository";

export class ExcelReader {
    constructor(private excelRepository: ExcelRepository) {}

    public async readTemplate(template: Template): Promise<DataPackage[]> {
        const { dataSources = [] } = template;

        const data = await promiseMap(dataSources, dataSource => {
            switch (dataSource.type) {
                case "cell":
                    return this.readByCell(template, dataSource);
                default:
                    throw new Error(`Type ${dataSource.type} not supported`);
            }
        });

        return _(data)
            .flatten()
            .groupBy(({ type, dataForm, id, period, orgUnit, attribute }) =>
                [type, dataForm, id, period, orgUnit, attribute].join("-")
            )
            .map((items, key) => {
                const [type, dataForm, id, period, orgUnit, attribute] = key.split("-");
                return {
                    type: type as DataFormType,
                    dataForm,
                    id: id ? String(id) : undefined,
                    orgUnit: String(orgUnit),
                    period: String(period),
                    attribute: attribute ? String(attribute) : undefined,
                    dataValues: _.flatMap(items, ({ dataValues }) => dataValues),
                };
            })
            .value();
    }

    private async readByCell(
        template: Template,
        dataSource: CellDataSource
    ): Promise<DataPackage[]> {
        const cell = await this.excelRepository.findRelativeCell(template.id, dataSource.ref);
        const value = cell ? await this.readCellValue(template, cell) : undefined;

        const dataFormId = await this.readCellValue(template, template.dataFormId);
        const dataFormType = await this.readCellValue(template, template.dataFormType);
        const orgUnit = await this.readCellValue(template, dataSource.orgUnit);
        const period = await this.readCellValue(template, dataSource.period);
        const dataElement = await this.readCellValue(template, dataSource.dataElement);
        const category = await this.readCellValue(template, dataSource.categoryOption);
        const attribute = await this.readCellValue(template, dataSource.attribute);
        const eventId = await this.readCellValue(template, dataSource.eventId);

        if (
            !orgUnit ||
            !period ||
            !dataElement ||
            !dataFormId ||
            (dataFormType !== "dataSets" && dataFormType !== "programs")
        )
            return [];

        return [
            {
                type: dataFormType,
                dataForm: String(dataFormId),
                id: eventId ? String(eventId) : undefined,
                orgUnit: String(orgUnit),
                period: String(period),
                attribute: attribute ? String(attribute) : undefined,
                dataValues: [
                    {
                        dataElement: String(dataElement),
                        category: String(category),
                        value: this.formatValue(value),
                    },
                ],
            },
        ];
    }

    private async readCellValue(template: Template, ref?: SheetRef | ValueRef, relative?: CellRef) {
        if (!ref) return undefined;
        if (ref.type === "value") return ref.id;
        const cell = await this.excelRepository.findRelativeCell(template.id, ref, relative);
        if (cell) return this.excelRepository.readCell(template.id, cell);
    }

    private formatValue(value: Value | undefined): DataValue["value"] {
        if (value instanceof Date) return value.toISOString();
        return value !== undefined ? String(value) : "";
    }
}
