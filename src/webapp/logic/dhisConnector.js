import _ from "lodash";
import { getJSON } from "../utils/requests";
import axios from "axios";

export async function getElement(d2, type, id) {
    const baseUrl = d2.Api.getApi().baseUrl;
    const endpoint = type === "dataSet" ? "dataSets" : "programs";
    const {
        data,
    } = await axios.get(
        `${baseUrl}/${endpoint}/${id}?fields=id,displayName,organisationUnits[id,path],attributeValues[attribute[code],value]categoryCombo,dataSetElements,sections,periodType,programStages`,
        { withCredentials: true }
    );

    return data;
}

/**
 * @param builder:
 *      - d2: DHIS2 Library
 *      - element: Element to be parsed
 *      - organisationUnits: Org Units to be parsed
 * @returns {Promise<Object>}:
 *      - element: The given element
 *      - elementMetadata: The requested metadata
 *      - organisationUnits: The orgUnits
 */
export function getElementMetadata(builder) {
    return new Promise(function (resolve, reject) {
        const elementMetadata = new Map();
        let organisationUnits = [];
        let rawMetadata = {};

        const endpoint = builder.element.type === "dataSet" ? "dataSets" : "programs";

        const API_BASE_URL = builder.d2.Api.getApi().baseUrl;
        // TODO: Optimize query with less fields
        const API_ELEMENT =
            API_BASE_URL + "/" + endpoint + "/" + builder.element.id + "/metadata.json";
        const API_ORG_UNITS =
            API_BASE_URL +
            "/metadata.json?fields=id,displayName,dataSets&filter=id:in:[" +
            builder.organisationUnits.toString() +
            "]";
        getJSON(builder.d2, API_ELEMENT)
            .then(json => {
                rawMetadata = json;
                _.forOwn(json, (value, key) => {
                    if (Array.isArray(value)) {
                        _.forEach(value, object => {
                            if (object.id !== undefined && builder.d2.models[key] !== undefined) {
                                object.type = builder.d2.models[key].name;
                                elementMetadata.set(object.id, object);
                            }
                        });
                    }
                });
                if (builder.organisationUnits.length !== 0)
                    return getJSON(builder.d2, API_ORG_UNITS);
            })
            .then(json => {
                if (json && json.organisationUnits) organisationUnits = json.organisationUnits;
            })
            .then(() => {
                resolve({
                    element: builder.element,
                    elementMetadata,
                    organisationUnits,
                    rawMetadata,
                });
            })
            .catch(reason => reject(reason));
    });
}

/**
 * @param builder
 *      - d2: DHIS2 Library
 *      - element: Element where import
 *      - data: Data to import
 */
export function importData(builder) {
    console.log(builder.data);
    return new Promise(function (resolve, reject) {
        const isProgram = builder.element.type === "program";
        const endpoint = isProgram ? "/events" : "/dataValueSets";

        const baseUrl = builder.d2.Api.getApi().baseUrl;
        axios
            .post(baseUrl + endpoint, builder.data, { withCredentials: true })
            .then(response => {
                if (response !== undefined) resolve(response);
            })
            .catch(reason => {
                reject(reason);
            });
    });
}