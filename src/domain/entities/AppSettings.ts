import { GetArrayInnerType } from "../../utils/types";

const models = ["dataSet", "program"] as const;
export type Model = GetArrayInnerType<typeof models>;
export type Models = Record<Model, boolean>;

export type OrgUnitSelectionSetting = "generation" | "import" | "both";
export type DuplicateToleranceUnit = "day" | "week" | "month" | "year";

export interface AppSettings {
    models: Record<Model, boolean>;
    permissionsForGeneration: string[];
    permissionsForSettings: string[];
    orgUnitSelection: OrgUnitSelectionSetting;
    duplicateTolerance: number;
    duplicateToleranceUnit: DuplicateToleranceUnit;
}
