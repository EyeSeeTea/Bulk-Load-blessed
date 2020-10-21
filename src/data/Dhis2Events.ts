import _ from "lodash";
import { ImportSummary } from "../domain/entities/ImportSummary";
import { D2Api } from "../types/d2-api";

export interface Event {
    event?: string;
    orgUnit: string;
    program: string;
    status: string;
    eventDate: string;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
    attributeOptionCombo?: string;
    trackedEntityInstance?: string;
    programStage?: string;
    dataValues: Array<{
        dataElement: string;
        value: string | number | boolean;
    }>;
}

export interface EventsPostResponse {
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
