import { D2Api, DataValueSetsDataValue, Id } from "d2-api";
import _ from "lodash";
import i18n from "../../locales";
import { promiseMap } from "../utils/common";

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
    const allPeriods = dataValues.map(dataValue => dataValue.period.toString());

    const dbDataValues = await promiseMap(_.chunk(allPeriods, 300), period =>
        api.dataValues.getSet({ dataSet: [dataSet], orgUnit: [orgUnit], period }).getData()
    );

    return dbDataValues.flatMap(({ dataValues }) => dataValues);
}

export async function deleteDataValues(
    api: D2Api,
    dataValues: DataValueSetsDataValue[]
): Promise<number> {
    if (_.isEmpty(dataValues)) return 0;

    const response = await api.dataValues
        .postSet({ importStrategy: "DELETE" }, { dataValues })
        .getData();

    if (response.status !== "SUCCESS") {
        const details = JSON.stringify(response.conflicts, null, 2);
        throw new Error(i18n.t("Error deleting data values") + ": " + details);
    } else {
        return response.importCount.deleted;
    }
}
