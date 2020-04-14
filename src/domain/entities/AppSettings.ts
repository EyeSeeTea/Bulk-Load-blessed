const models = ["dataSet", "program"] as const;

type GetArrayInnerType<T extends readonly any[]> = T[number];
export type Model = GetArrayInnerType<typeof models>;

type Models = Record<Model, boolean>;

export interface AppSettings {
    models: Models;
    userGroupsForGeneration: string[];
    userGroupsForSettings: string[];
    showOrgUnitsOnGeneration: boolean;
}

export const defaultAppSettings: AppSettings = {
    models: { dataSet: true, program: false },
    userGroupsForGeneration: ["HMIS Officers"],
    userGroupsForSettings: [],
    showOrgUnitsOnGeneration: false,
};
