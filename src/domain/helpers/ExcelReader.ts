import _ from "lodash";
import { promiseMap } from "../../webapp/utils/promises";
import { DataPackage, DataPackageData, DataPackageValue } from "../entities/DataPackage";
import { CellDataSource, CellRef, SheetRef, Template, ValueRef } from "../entities/Template";
import { ExcelRepository, ExcelValue } from "../repositories/ExcelRepository";

export class ExcelReader {
    constructor(private excelRepository: ExcelRepository) {}

    public async readTemplate(template: Template): Promise<DataPackage | undefined> {
        const { dataSources = [] } = template;

        const dataFormType = await this.readCellValue(template, template.dataFormType);

        if (
            dataFormType !== "dataSets" &&
            dataFormType !== "programs" &&
            dataFormType !== "trackerPrograms"
        ) {
            return undefined;
        }

        const data = await promiseMap(dataSources, dataSource => {
            switch (dataSource.type) {
                case "cell":
                    return this.readByCell(template, dataSource);
                default:
                    throw new Error(`Type ${dataSource.type} not supported`);
            }
        });

        return {
            type: dataFormType,
            dataEntries: _(data)
                .flatten()
                .groupBy(({ dataForm, id, period, orgUnit, attribute }) =>
                    [dataForm, id, period, orgUnit, attribute].join("-")
                )
                .map((items, key) => {
                    const [dataForm, id, period, orgUnit, attribute] = key.split("-");
                    return {
                        dataForm,
                        id: id ? String(id) : undefined,
                        orgUnit: String(orgUnit),
                        period: String(period),
                        attribute: attribute ? String(attribute) : undefined,
                        dataValues: _.flatMap(items, ({ dataValues }) => dataValues),
                    };
                })
                .value(),
        };
    }

    private async readByCell(
        template: Template,
        dataSource: CellDataSource
    ): Promise<DataPackageData[]> {
        const cell = await this.excelRepository.findRelativeCell(template.id, dataSource.ref);
        const value = cell ? await this.readCellValue(template, cell) : undefined;

        const dataFormId = await this.readCellValue(template, template.dataFormId);
        const orgUnit = await this.readCellValue(template, dataSource.orgUnit);
        const period = await this.readCellValue(template, dataSource.period);
        const dataElement = await this.readCellValue(template, dataSource.dataElement);
        const category = await this.readCellValue(template, dataSource.categoryOption);
        const attribute = await this.readCellValue(template, dataSource.attribute);
        const eventId = await this.readCellValue(template, dataSource.eventId);

        if (!orgUnit || !period || !dataElement || !dataFormId) {
            return [];
        }

        return [
            {
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

    private formatValue(value: ExcelValue | undefined): DataPackageValue {
        if (value instanceof Date) return value.toISOString();
        return value !== undefined ? String(value) : "";
    }
}
