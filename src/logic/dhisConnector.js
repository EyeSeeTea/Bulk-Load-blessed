import _ from 'lodash';
import {getJSON} from "./utils";

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
            username: undefined,
            dataSets: [],
            programs: []
        };

        const API_BASE_URL = builder.d2.Api.getApi().baseUrl;
        const API_USER_INFO = API_BASE_URL + "/me.json?paging=FALSE&fields=userCredentials,displayName";
        // Parse API to get user information (username and roles)
        getJSON(API_USER_INFO).then((userInfo) => {
            result.username = userInfo.userCredentials.username;
            // For each userRole parse the available programs and dataSets
            _.forEach(userInfo.userCredentials.userRoles, function (role) {
                const API_USER_ROLES = API_BASE_URL + "/userRoles/" + role.id + ".json?paging=FALSE&fields=programs,dataSets";
                getJSON(API_USER_ROLES).then((userRoles) => {
                    const API_USER_PROGRAMS_DATASETS = API_BASE_URL + "/metadata.json?fields=id,displayName," +
                        "categoryCombo,dataSetElements,sections,periodType,programStages&filter=id:in:[" +
                        _.union(userRoles.programs.map(e => e.id), userRoles.dataSets.map(e => e.id)).toString() + ']';
                    // Parse API for programs and dataSets information
                    getJSON(API_USER_PROGRAMS_DATASETS).then((userProgramsAndDatasets) => {
                        _.forEach(["programs", "dataSets"], type => {
                            _.forEach(userProgramsAndDatasets[type], element => {
                                element.value = element.id;
                                element.label = element.displayName;
                                element.type = builder.d2.models[type].name;
                                element.endpoint = type;
                                result[type].push(element.id, element);
                            });
                        });
                    });
                });
            });
        }).then(() => resolve(result)).catch(reason => reject(reason));
    });
}

/**
 * Get User Information
 * @param builder:
 *      - d2: DHIS2 Library
 *      - element: Element to be parsed
 * @returns {Promise<Object>}:
 *      - element: The given element
 *      - elementMetadata: The requested metadata
 */
export function getElementMetadata(builder) {
    return new Promise(function (resolve, reject) {
        let elementMetadata = new Map();

        const API_BASE_URL = builder.d2.Api.getApi().baseUrl;
        const API_ELEMENT = API_BASE_URL + "/" + builder.element.endpoint + "/" + builder.element.id + "/metadata.json";
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
            resolve({
                element: builder.element,
                elementMetadata: elementMetadata
            });
        }).catch(reason => reject(reason));
    });
}