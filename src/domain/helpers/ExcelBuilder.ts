import _ from "lodash";
import { fromBase64 } from "../../utils/files";
import { removeCharacters } from "../../utils/string";
import { promiseMap } from "../../webapp/utils/promises";
import { DataPackage } from "../entities/DataPackage";
import { Template, RowDataSource } from "../entities/Template";
import { Theme, ThemeStyle } from "../entities/Theme";
import { ExcelRepository } from "../repositories/ExcelRepository";

export class ExcelBuilder {
    constructor(private excelRepository: ExcelRepository) {}

    public async populateTemplate(template: Template, payload: DataPackage[]): Promise<void> {
        const { dataSources = [] } = template;
        for (const dataSource of dataSources) {
            switch (dataSource.type) {
                case "row":
                    await this.fillByRow(template, dataSource, payload);
                    break;
                default:
                    throw new Error(`Type ${dataSource.type} not supported`);
            }
        }
    }

    private async fillByRow(template: Template, dataSource: RowDataSource, payload: DataPackage[]) {
        let { rowStart } = dataSource.range;

        for (const { id, orgUnit, period, attribute, dataValues } of payload) {
            const cells = await this.excelRepository.getCellsInRange(template, {
                ...dataSource.range,
                rowStart,
                rowEnd: rowStart,
            });

            const orgUnitCell = await this.excelRepository.findRelativeCell(
                template,
                dataSource.orgUnit,
                cells[0]
            );
            if (orgUnitCell && orgUnit) {
                await this.excelRepository.writeCell(template, orgUnitCell, orgUnit);
            }

            const eventIdCell = await this.excelRepository.findRelativeCell(
                template,
                dataSource.eventId,
                cells[0]
            );
            if (eventIdCell && id) {
                await this.excelRepository.writeCell(template, eventIdCell, id);
            }

            const periodCell = await this.excelRepository.findRelativeCell(
                template,
                dataSource.period,
                cells[0]
            );
            if (periodCell) await this.excelRepository.writeCell(template, periodCell, period);

            const attributeCell = await this.excelRepository.findRelativeCell(
                template,
                dataSource.attribute,
                cells[0]
            );
            if (attributeCell && attribute) {
                await this.excelRepository.writeCell(template, attributeCell, attribute);
            }

            for (const cell of cells) {
                const dataElementCell = await this.excelRepository.findRelativeCell(
                    template,
                    dataSource.dataElement,
                    cell
                );
                const categoryCell = await this.excelRepository.findRelativeCell(
                    template,
                    dataSource.categoryOption,
                    cell
                );

                const dataElement = dataElementCell
                    ? removeCharacters(
                          await this.excelRepository.readCell(template, dataElementCell)
                      )
                    : undefined;
                const category = categoryCell
                    ? removeCharacters(await this.excelRepository.readCell(template, categoryCell))
                    : undefined;

                const { value } =
                    dataValues.find(
                        dv => dv.dataElement === dataElement && dv.category === category
                    ) ?? {};

                if (value) await this.excelRepository.writeCell(template, cell, value);
            }

            rowStart += 1;
        }
    }

    public async applyTheme(template: Template, theme: Theme): Promise<void> {
        _.forOwn(theme.sections, (style: ThemeStyle, section: string) => {
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source) this.excelRepository.styleCell(template, source, style);
        });

        await promiseMap(_.toPairs(theme.pictures), async ([section, image]) => {
            const file = image ? await fromBase64(image.src) : undefined;
            const styleSource = template.styleSources.find(source => source.section === section);
            const { source } = styleSource ?? {};
            if (source && file) this.excelRepository.addPicture(template, source, file);
        });
    }
}
