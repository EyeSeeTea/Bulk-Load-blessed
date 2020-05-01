import { D2Api, D2ApiDefault } from "d2-api";
import _ from "lodash";
import { DataPackage } from "../domain/entities/DataPackage";
import { AggregatedDataValue, DataSet } from "../domain/entities/DataSet";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { Program } from "../domain/entities/Program";
import {
    GetDataPackageParams,
    InstanceRepository,
} from "../domain/repositories/InstanceRepository";

export class InstanceDhisRepository implements InstanceRepository {
    private api: D2Api;

    constructor({ url }: DhisInstance) {
        this.api = new D2ApiDefault({ baseUrl: url });
    }

    public async getDataSets(): Promise<DataSet[]> {
        const { objects } = await this.api.models.dataSets
            .get({ paging: false, fields: { id: true, displayName: true, name: true } })
            .getData();
        return objects.map(({ id, displayName, name }) => ({ id, name: displayName ?? name }));
    }

    public async getPrograms(): Promise<Program[]> {
        const { objects } = await this.api.models.programs
            .get({ paging: false, fields: { id: true, displayName: true, name: true } })
            .getData();
        return objects.map(({ id, displayName, name }) => ({ id, name: displayName ?? name }));
    }

    public async getDataPackage({
        type,
        id,
        orgUnits,
        startDate,
        endDate,
    }: GetDataPackageParams): Promise<DataPackage[]> {
        if (type === "dataSet") {
            const { dataValues } = await this.api
                .get<{ dataValues: AggregatedDataValue[] }>("/dataValueSets", {
                    dataSet: id,
                    startDate: startDate?.format("YYYY-MM-DD"),
                    endDate: endDate?.format("YYYY-MM-DD"),
                    orgUnit: orgUnits,
                })
                .getData();

            return _(dataValues)
                .groupBy(({ period, orgUnit, attributeOptionCombo }) =>
                    [period, orgUnit, attributeOptionCombo].join("-")
                )
                .map((dataValues, key) => {
                    const [period, orgUnit, attribute] = key.split("-");
                    return {
                        orgUnit,
                        period,
                        attribute,
                        dataValues: dataValues.map(
                            ({ dataElement, categoryOptionCombo, value, comment }) => ({
                                dataElement,
                                category: categoryOptionCombo,
                                value,
                                comment,
                            })
                        ),
                    };
                })
                .value();
        } else if (type === "program") {
            return [];
        } else {
            return [];
        }
    }
}
