import { D2Api } from "../../../types/d2-api";
import { MigrationTasks } from "../client/types";

export function getMigrationTasks(): MigrationTasks<MigrationParams> {
    return [[1, import("./01.settings-permissions")]];
}

export interface MigrationParams {
    d2Api: D2Api;
}
