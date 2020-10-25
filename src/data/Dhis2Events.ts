import { D2Api } from "../types/d2-api";
import { Event } from "../domain/entities/DhisDataPackage";
import { SynchronizationResult } from "../domain/entities/SynchronizationResult";
import { ImportPostResponse, postImport } from "./Dhis2Import";
import i18n from "../locales";

export async function postEvents(api: D2Api, events: Event[]): Promise<SynchronizationResult> {
    return postImport(() => api.post<ImportPostResponse>("/events", {}, { events }).getData(), {
        title: i18n.t("Data values - Create/update"),
        model: i18n.t("Event"),
        splitStatsList: true,
    });
}
