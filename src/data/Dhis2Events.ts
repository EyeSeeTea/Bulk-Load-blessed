import { D2Api } from "../types/d2-api";
import { Event } from "../domain/entities/DhisDataPackage";
import { SynchronizationResult } from "../domain/entities/SynchronizationResult";
import { ImportPostResponse, postImport } from "./Dhis2Import";

export async function postEvents(api: D2Api, events: Event[]): Promise<SynchronizationResult> {
    return postImport("events", () =>
        api.post<ImportPostResponse>("/events", {}, { events }).getData()
    );
}
