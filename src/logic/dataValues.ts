import { Id, D2Api, DataValueSetsDataValue, DataValueSetsPostRequest } from "d2-api";
import _ from "lodash";
import i18n from "../locales";

interface DataValuesData {
    dataSet: Id;
    orgUnit: Id;
    dataValues: Array<{
        dataElement: Id;
        categoryOptionCombo: Id;
        value: string;
        period: string | number;
        orgUnit: string;
    }>;
}

export async function getDataValuesFromData(api: D2Api, data: DataValuesData) {
    const { dataSet, orgUnit, dataValues } = data;
    const periods = dataValues.map(dataValue => dataValue.period.toString());

    const dbDataValues = await api.dataValues
        .getSet({ dataSet: [dataSet], orgUnit: [orgUnit], period: periods })
        .getData();

    return dbDataValues.dataValues;
}

export async function deleteDataValues(
    api: D2Api,
    dataValues: DataValueSetsDataValue[]
): Promise<number> {
    if (_.isEmpty(dataValues)) return 0;

    const requests = getDataValuesRequests(dataValues);

    let deletedCount = 0;

    for (const request of requests) {
        // Force delete (it will allow removal of approved data values). It has effect only for superusers.
        const response = await api.dataValues
            .postSet({ importStrategy: "DELETE", force: true }, request)
            .getData();

        if (response.status !== "SUCCESS") {
            throw new Error(
                i18n.t("Error deleting data values") +
                    ": " +
                    JSON.stringify(response.conflicts, null, 2)
            );
        }

        deletedCount += response.importCount.deleted;
    }

    return deletedCount;
}

function getDataValuesRequests(dataValues: DataValueSetsDataValue[]): DataValueSetsPostRequest[] {
    return _(dataValues)
        .groupBy(dv => [dv.period, dv.orgUnit, dv.attributeOptionCombo].join("-"))
        .map(dataValuesGroup => {
            const dataValue = dataValuesGroup[0];
            return {
                period: dataValue.period,
                orgUnit: dataValue.orgUnit,
                attributeOptionCombo: dataValue.attributeOptionCombo,
                dataValues: dataValuesGroup.map(dv => ({
                    dataElement: dv.dataElement,
                    categoryOptionCombo: dv.categoryOptionCombo,
                    value: dv.value,
                })),
            };
        })
        .value();
}
