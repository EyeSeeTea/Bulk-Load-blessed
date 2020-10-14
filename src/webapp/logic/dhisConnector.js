import _ from "lodash";
import { promiseMap } from "../utils/promises";

export async function getElement(api, type, id) {
    const endpoint = type === "dataSets" ? "dataSets" : "programs";
    const fields = [
        "id",
        "displayName",
        "organisationUnits[id,path]",
        "attributeValues[attribute[code],value]",
        "categoryCombo",
        "dataSetElements",
        "sections",
        "periodType",
        "programStages",
        "programType",
        "enrollmentDateLabel",
        "captureCoordinates",
        "programTrackedEntityAttributes[trackedEntityAttribute[id,name,valueType,optionSet[id,name,options[id]]]],",
    ].join(",");
    const response = await api.get(`/${endpoint}/${id}`, { fields }).getData();
    return { ...response, type };
}

export async function getElementMetadata({ element, api, orgUnitIds }) {
    const elementMetadata = new Map();
    const endpoint = element.type === "dataSets" ? "dataSets" : "programs";
    const rawMetadata = await api.get(`/${endpoint}/${element.id}/metadata.json`).getData();
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

    const metadata = await api.metadata
        .get({
            relationshipTypes: { fields: { id: true, name: true } },
        })
        .getData();

    const organisationUnits = _.flatMap(responses, ({ organisationUnits }) => organisationUnits);

    return { element, metadata, elementMetadata, organisationUnits, rawMetadata };
}

export async function importData({ element, api, data }) {
    const isProgram = element.type === "programs" || element.type === "trackerPrograms";
    const endpoint = isProgram ? "/events" : "/dataValueSets";
    const object = isProgram ? { events: data } : { dataValues: data };
    const response = await api.post(endpoint, {}, object).getData();
    return response;
}

export function importOrgUnitByUID(api, uid) {
    return api.get("/organisationUnits/" + uid).getData();
}
