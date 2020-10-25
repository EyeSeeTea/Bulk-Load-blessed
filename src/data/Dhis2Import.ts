import _ from "lodash";
import {
    SynchronizationResult,
    SynchronizationStats,
} from "../domain/entities/SynchronizationResult";

export interface ImportPostResponse {
    status: "SUCCESS" | "ERROR";
    message?: string;
    response: {
        imported: number;
        updated: number;
        deleted: number;
        ignored: number;
        total: number;
        importSummaries?: {
            description?: string;
            reference: string;
            conflicts?: {
                object: string;
                value: string;
            }[];
        }[];
    };
}

export function processImportResponse(
    type: string,
    importResult: ImportPostResponse
): SynchronizationResult {
    const { status, message, response } = importResult;

    const errors =
        response.importSummaries?.flatMap(
            ({ reference = "", description, conflicts }) =>
                conflicts?.map(({ object, value }) => ({
                    id: reference,
                    message: _([description, object, value]).compact().join(" "),
                })) ?? (description ? [{ id: reference, message: description }] : [])
        ) ?? [];

    const fields = ["imported", "updated", "ignored", "deleted", "total"] as const;
    const stats: SynchronizationStats = { type, ..._.pick(response, fields) };

    return { status, message, errors, stats: [stats], rawResponse: importResult };
}

export async function postImport(
    type: string,
    postFn: () => Promise<ImportPostResponse>
): Promise<SynchronizationResult> {
    try {
        const response = await postFn();
        return processImportResponse(type, response);
    } catch (error) {
        if (error?.response?.data) {
            return processImportResponse(type, error.response.data);
        } else {
            return { status: "NETWORK ERROR", rawResponse: {} };
        }
    }
}
