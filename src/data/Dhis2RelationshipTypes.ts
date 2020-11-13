import _ from "lodash";
import {
    TrackedEntityInstance,
    isRelationshipValid,
} from "../domain/entities/TrackedEntityInstance";
import { Relationship } from "../domain/entities/Relationship";
import { getUid } from "./dhis2-uid";
import { RelationshipApi, TrackedEntityInstanceApi } from "./TrackedEntityInstanceTypes";
import { D2Api, Ref, Id } from "../types/d2-api";
import { D2RelationshipConstraint } from "d2-api/schemas";
import { promiseMap } from "../webapp/utils/promises";
import { getTrackedEntityInstances } from "./Dhis2TrackedEntityInstances";

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

interface Program {
    id: Id;
    organisationUnits: Ref[];
    trackedEntityType: Ref;
}

interface RelationshipType {
    id: Id;
    name: string;
    trackedEntityInstances: Ref[];
}

interface Metadata {
    relationshipTypes: RelationshipType[];
}

export async function getTrackerProgramMetadata(program: Program, api: D2Api): Promise<Metadata> {
    const { relationshipTypes: allRelationshipTypes } = await api.metadata
        .get({
            relationshipTypes: {
                fields: {
                    id: true,
                    name: true,
                    fromConstraint: true,
                    toConstraint: true,
                },
            },
        })
        .getData();

    const relationshipTypes = allRelationshipTypes.filter(relType => {
        const { fromConstraint, toConstraint } = relType;
        const areTeiConstraints =
            fromConstraint.relationshipEntity === "TRACKED_ENTITY_INSTANCE" &&
            toConstraint.relationshipEntity === "TRACKED_ENTITY_INSTANCE";

        const hasSomeTeiConstraintTheProgramTrackedEntityType =
            isProgramAssociatedWithTeiConstraint(program, fromConstraint) ||
            isProgramAssociatedWithTeiConstraint(program, toConstraint);

        return areTeiConstraints && hasSomeTeiConstraintTheProgramTrackedEntityType;
    });

    const relationshipTypesWithTeis = await promiseMap(relationshipTypes, async relType => {
        const trackedEntityInstances = await getTrackedEntityInstances({
            api,
            program,
            orgUnits: program.organisationUnits,
        });
        return { ...relType, trackedEntityInstances };
    });

    return { relationshipTypes: relationshipTypesWithTeis };
}

function isProgramAssociatedWithTeiConstraint(
    program: Program,
    constraint: D2RelationshipConstraint
): boolean {
    return (
        constraint.relationshipEntity === "TRACKED_ENTITY_INSTANCE" &&
        constraint.trackedEntityType.id === program.trackedEntityType.id &&
        (!constraint.program || constraint.program.id === program.id)
    );
}
