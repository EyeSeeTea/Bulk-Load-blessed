export interface ImportSummary {
    status: "SUCCESS" | "ERROR" | "WARNING";
    stats: ImportSummaryStats;
    description: string;
    errors: string[];
}

export interface ImportSummaryStats {
    created: number;
    updated: number;
    deleted: number;
    ignored: number;
}

export const emptyImportSummary: ImportSummary = {
    status: "SUCCESS",
    stats: { created: 0, updated: 0, deleted: 0, ignored: 0 },
    description: "",
    errors: [],
};
