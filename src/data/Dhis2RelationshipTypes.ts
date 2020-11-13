import _ from "lodash";
import {
    TrackedEntityInstance,
    isRelationshipValid,
} from "../domain/entities/TrackedEntityInstance";
import { Relationship } from "../domain/entities/Relationship";
import { getUid } from "./dhis2-uid";
import { RelationshipApi, TrackedEntityInstanceApi } from "./TrackedEntityInstanceTypes";
import { D2Api } from "../types/d2-api";

export function getApiRelationships(
    existingTei: TrackedEntityInstance | undefined,
    relationships: Relationship[]
): RelationshipApi[] {
    const existingRelationships = existingTei?.relationships || [];

    const apiRelationships = _(relationships)
        .concat(existingRelationships)
        .filter(isRelationshipValid)
        .uniqBy(rel => [rel.typeId, rel.fromId, rel.toId].join("-"))
        .map(rel => {
            const relationshipId =
                rel.id ||
                existingRelationships.find(
                    eRel =>
                        eRel.typeId === rel.typeId &&
                        eRel.fromId === rel.fromId &&
                        eRel.toId === rel.toId
                )?.id ||
                getUid([rel.typeId, rel.fromId, rel.toId].join("-"));

            const relApi: RelationshipApi = {
                relationship: relationshipId,
                relationshipType: rel.typeId,
                relationshipName: rel.typeName,
                from: { trackedEntityInstance: { trackedEntityInstance: rel.fromId } },
                to: { trackedEntityInstance: { trackedEntityInstance: rel.toId } },
            };
            return relApi;
        })
        .compact()
        .value();
    return apiRelationships;
}

export function fromApiRelationships(teiApi: TrackedEntityInstanceApi): Relationship[] {
    return _(teiApi.relationships)
        .map(relApi =>
            relApi.from.trackedEntityInstance && relApi.to.trackedEntityInstance
                ? {
                      id: relApi.relationship,
                      typeId: relApi.relationshipType,
                      typeName: relApi.relationshipName,
                      fromId: relApi.from.trackedEntityInstance.trackedEntityInstance,
                      toId: relApi.to.trackedEntityInstance.trackedEntityInstance,
                  }
                : null
        )
        .compact()
        .value();
}

export async function getTrackerProgramMetadata(api: D2Api) {
    const { relationshipTypes } = await api.metadata
        .get({
            relationshipTypes: { fields: { id: true, name: true } },
        })
        .getData();
    return { relationshipTypes };
}
