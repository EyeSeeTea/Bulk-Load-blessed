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
