const models = ["dataSet", "program"] as const;

type GetArrayInnerType<T extends readonly any[]> = T[number];
export type Model = GetArrayInnerType<typeof models>;
export type OrgUnitSelectionSetting = "generation" | "import" | "both";

export interface AppSettings {
    models: Record<Model, boolean>;
    permissionsForGeneration: string[];
    permissionsForSettings: string[];
    orgUnitSelection: OrgUnitSelectionSetting;
}
