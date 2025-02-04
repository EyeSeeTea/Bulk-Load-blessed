import _ from "lodash";
import { D2Api } from "../types/d2-api";
import { Event } from "../domain/entities/DhisDataPackage";
import { SynchronizationResult } from "../domain/entities/SynchronizationResult";
import i18n from "../locales";
import { promiseMap } from "../utils/promises";
import { ImportPostResponse, postImport } from "./Dhis2Import";
import { TrackedEntityInstance } from "../domain/entities/TrackedEntityInstance";
import { getUid } from "./dhis2-uid";

export async function postEvents(
    api: D2Api,
    events: Event[],
    options: { existingTeis: TrackedEntityInstance[]; teis: TrackedEntityInstance[] }
): Promise<SynchronizationResult[]> {
    const eventsWithEnrollment = setEnrollmentToEvent(events, options);

    const eventsResult = await promiseMap(_.chunk(eventsWithEnrollment, 200), eventsToSave => {
        return postImport(
            api,
            async () => await api.post<ImportPostResponse>("/tracker", {}, { events: eventsToSave }).getData(),
            {
                title: i18n.t("Events - Create/update"),
                model: i18n.t("Event"),
                splitStatsList: true,
            }
        );
    });

    return eventsResult;
}

function setEnrollmentToEvent(
    events: Event[],
    options: { existingTeis: TrackedEntityInstance[]; teis: TrackedEntityInstance[] }
) {
    const { existingTeis, teis } = options;
    return teis.length === 0
        ? events
        : events.map(event => {
              const existingTei = existingTeis.find(tei => tei.id === event.trackedEntity);
              const tei = teis.find(tei => tei.id === event.trackedEntity);
              if (!tei) return event;
              const enrollmentId = existingTei?.enrollment?.id || getUid([tei.id, tei.orgUnit, tei.program].join("-"));
              return { ...event, enrollment: enrollmentId };
          });
}
