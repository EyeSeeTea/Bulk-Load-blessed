import { GetArrayInnerType } from "../../types/utils";
import { Id } from "./ReferenceObject";

const models = ["dataSet", "program"] as const;
export type Model = GetArrayInnerType<typeof models>;
export type Models = Record<Model, boolean>;

export type OrgUnitSelectionSetting = "generation" | "import" | "both";
export type DuplicateToleranceUnit = "day" | "week" | "month" | "year";
export type DuplicateExclusion = Record<Id, Id[]>;

export interface AppSettings {
    models: Record<Model, boolean>;
    permissionsForGeneration: string[];
    permissionsForSettings: string[];
    permissionsForImport: string[];
    orgUnitSelection: OrgUnitSelectionSetting;
    duplicateEnabled: boolean;
    duplicateExclusion: DuplicateExclusion;
    duplicateTolerance: number;
    duplicateToleranceUnit: DuplicateToleranceUnit;
}
