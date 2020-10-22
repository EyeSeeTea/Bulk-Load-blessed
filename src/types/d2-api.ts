import { D2Api } from "d2-api/2.32";
import { getMockApiFromClass } from "d2-api";
import { DataStore as DataStore_ } from "d2-api/api/dataStore";

export * from "d2-api/2.32";
export const D2ApiDefault = D2Api;
export const getMockApi = getMockApiFromClass(D2Api);

export { DataStore_ as DataStore };
