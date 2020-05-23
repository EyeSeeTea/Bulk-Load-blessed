import { getMockApi } from "d2-api";

export function initializeMockServer() {
    const { api, mock } = getMockApi();

    // User settings
    mock.onGet("/me").reply(200, { userGroups: [{ id: "BwyMfDBLih9" }] });
    mock.onGet("/me/authorization").reply(200, ["USER_GROUP_TEST"]);
    mock.onGet("/metadata", { params: { "userGroups:fields": "displayName,id,name" } }).reply(200, {
        userGroups: [
            { name: "USER_GROUP_TEST", id: "BwyMfDBLih9", displayName: "USER_GROUP_TEST" },
        ],
    });

    // App Storage
    mock.onGet("/dataStore/bulk-load/BULK_LOAD_SETTINGS").reply(200, {
        models: { dataSet: true, program: true },
        userGroupsForGeneration: ["BwyMfDBLih9"],
        userGroupsForSettings: ["BwyMfDBLih9"],
        orgUnitSelection: "both",
    });

    // Organisation units
    mock.onGet("/organisationUnits", {
        params: { userOnly: true, fields: "displayName,id,level,path" },
    }).reply(200, {
        organisationUnits: [
            { level: 1, id: "H8RixfF8ugH", path: "/H8RixfF8ugH", displayName: "Global" },
        ],
    });

    // Default fallback
    mock.onAny().reply(({ method, url, params }) => {
        console.error("Network error", { method, url, params });
        return [500, {}];
    });

    return { api, mock };
}
