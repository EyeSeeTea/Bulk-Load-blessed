import _ from "lodash";
import { ImportSummary } from "../domain/entities/ImportSummary";
import { D2Api } from "../types/d2-api";
import { Event } from "../domain/entities/DhisDataPackage";

interface EventsPostResponse {
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

export async function postEvents(api: D2Api, events: Event[]): Promise<ImportSummary> {
    const { status, message, response } = await api
        .post<EventsPostResponse>("/events", {}, { events })
        .getData();

    const { imported: created, deleted, updated, ignored } = response;
    const errors =
        response.importSummaries?.flatMap(({ reference = "", description = "", conflicts = [] }) =>
            conflicts.map(({ object, value }) =>
                _([reference, description, object, value]).compact().join(" ")
            )
        ) ?? [];

    return {
        status,
        description: message ?? "",
        stats: { created, deleted, updated, ignored },
        errors,
    };
}
