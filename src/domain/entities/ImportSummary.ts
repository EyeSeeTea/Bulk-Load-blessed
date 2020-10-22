import _ from "lodash";

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

export const mergeSummaries = (...array: Array<ImportSummary | undefined>): ImportSummary => {
    const summaries = _.compact(array);

    const statusMessages = summaries.map(({ status }) => status);
    const status = _.uniq(statusMessages).length === 1 ? statusMessages[0] : "ERROR";
    const description = summaries.map(({ description }) => description).join("\n");
    const errors = _.flatMap(summaries, ({ errors }) => errors);

    const stats = {
        created: _.sum(summaries.map(({ stats }) => stats.created)),
        updated: _.sum(summaries.map(({ stats }) => stats.updated)),
        deleted: _.sum(summaries.map(({ stats }) => stats.deleted)),
        ignored: _.sum(summaries.map(({ stats }) => stats.ignored)),
    };

    return { status, stats, description, errors };
};
