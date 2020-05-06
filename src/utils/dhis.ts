import _ from "lodash";

export function cleanOrgUnitPath(orgUnitPath?: string): string {
    return _(orgUnitPath).split("/").last() ?? "";
}

export function cleanOrgUnitPaths(orgUnitPaths: string[]): string[] {
    return orgUnitPaths.map(cleanOrgUnitPath);
}

export function isValidUid(uid?: string): boolean {
    if (!uid) return false;
    return /^[a-zA-Z]{1}[a-zA-Z0-9]{10}$/.test(uid);
}
