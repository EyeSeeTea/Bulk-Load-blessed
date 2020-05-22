import _ from "lodash";
import { promiseMap } from "../utils/common";

export async function getElement(api, type, id) {
    const fields =
        "id,displayName,organisationUnits[id,path],attributeValues[attribute[code],value],categoryCombo,dataSetElements,sections,periodType,programStages";
    const response = await api.get(`/${type}/${id}`, { fields }).getData();
    return { ...response, type };
}

export async function getElementMetadata({ element, api, orgUnitIds }) {
    const elementMetadata = new Map();
    const rawMetadata = await api.get(`/${element.type}/${element.id}/metadata.json`).getData();
    _.forOwn(rawMetadata, (value, type) => {
        if (Array.isArray(value)) {
            _.forEach(value, object => {
                if (object.id) elementMetadata.set(object.id, { ...object, type });
            });
        }
    });

    const responses = await promiseMap(_.chunk(orgUnitIds, 400), orgUnits =>
        api
            .get("/metadata", {
                fields: "id,displayName,translations",
                filter: `id:in:[${orgUnits}]`,
            })
            .getData()
    );

    const organisationUnits = _.flatMap(responses, ({ organisationUnits }) => organisationUnits);

    return { element, elementMetadata, organisationUnits, rawMetadata };
}

export async function importData({ element, api, data }) {
    const endpoint = element.type === "programs" ? "/events" : "/dataValueSets";
    const response = await api.post(endpoint, {}, data).getData();
    return response;
}
