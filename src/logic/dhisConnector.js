import _ from 'lodash';
import {getJSON} from './utils';
import axios from 'axios';

/**
 * Get User Information
 * @param builder:
 *      - d2: DHIS2 Library
 * @returns {Promise<Object>}:
 *      - username: User name
 *      - userPrograms: User programs Map
 *      - userDataSets: User dataSets Map
 */
export function getUserInformation(builder) {
    return new Promise(function (resolve, reject) {
        let result = {
            username: builder.d2.currentUser.username,
            dataSets: [],
            programs: []
        };

        const API_BASE_URL = builder.d2.Api.getApi().baseUrl;
        let elements = [];

        builder.d2.models.dataSets.list({ fields: ['id'] }).then(dataSetCollection => {
            dataSetCollection.forEach(dataSet => elements.push(dataSet.id));
            return builder.d2.models.programs.list({ fields: ['id'] });
        }).then(programCollection => {
            programCollection.forEach(program => elements.push(program.id));
            const API_USER_PROGRAMS_DATASETS = API_BASE_URL + '/metadata.json?fields=id,displayName,' +
                'categoryCombo,dataSetElements,sections,periodType,programStages&filter=id:in:[' + elements.toString() + ']';
            // Parse API for programs and dataSets information
            return getJSON(API_USER_PROGRAMS_DATASETS);
        }).then((userProgramsAndDatasets) => {
            _.forEach(['programs', 'dataSets'], type => {
                _.forEach(userProgramsAndDatasets[type], element => {
                    element.value = element.id;
                    element.label = element.displayName;
                    element.type = builder.d2.models[type].name;
                    element.endpoint = type;
                    result[type].push(element);
                });
            });
            resolve(result);
        }).catch(reason => reject(reason));
    });
}

/**
 * Get User Information
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
        let elementMetadata = new Map();
        let organisationUnits = [];

        const API_BASE_URL = builder.d2.Api.getApi().baseUrl;
        // TODO: Optimize query with less fields
        const API_ELEMENT = API_BASE_URL + '/' + builder.element.endpoint + '/' + builder.element.id + '/metadata.json';
        const API_ORG_UNITS = API_BASE_URL + '/metadata.json?fields=id,displayName&filter=id:in:[' + builder.organisationUnits.toString() + ']';
        getJSON(API_ELEMENT).then((json) => {
            _.forOwn(json, (value, key) => {
                if (Array.isArray(value)) {
                    _.forEach(value, (object) => {
                        if (object.id !== undefined && builder.d2.models[key] !== undefined) {
                            object.type = builder.d2.models[key].name;
                            elementMetadata.set(object.id, object);
                        }
                    });
                }
            });
            if (builder.organisationUnits.length !== 0)
                return getJSON(API_ORG_UNITS);
        }).then((json) => {
            if (json && json.organisationUnits) organisationUnits = json.organisationUnits;
        }).then(() => {
            resolve({
                element: builder.element,
                elementMetadata: elementMetadata,
                organisationUnits: organisationUnits
            });
        }).catch(reason => reject(reason));
    });
}

/**
 * Import data to DHIS2 with a dryRun strategy
 * @param builder
 *      - d2: DHIS2 Library
 *      - element: Element where import
 *      - data: Data to import
 */
export function importData(builder) {
    return new Promise(function (resolve, reject) {
        let baseUrl = builder.d2.Api.getApi().baseUrl;
        axios.post(baseUrl + '/events', builder.data
        ).then(response => {
            if (response !== undefined) resolve(response);
        }).catch(reason => {
            reject(reason);
        });
    });
}