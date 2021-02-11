import _ from "lodash";
import { TrackedEntityInstance, isRelationshipValid } from "../domain/entities/TrackedEntityInstance";
import { Relationship } from "../domain/entities/Relationship";
import { getUid } from "./dhis2-uid";
import {
    RelationshipApi,
    TrackedEntityInstanceApi,
    TrackedEntityInstancesRequest,
    RelationshipItemApi,
} from "./TrackedEntityInstanceTypes";
import { D2Api, Ref, Id, D2RelationshipConstraint } from "../types/d2-api";
import { promiseMap } from "../webapp/utils/promises";
import { NamedRef } from "../domain/entities/ReferenceObject";
import { RelationshipType, RelationshipConstraint } from "../domain/entities/RelationshipType";
import { memoizeAsync } from "../utils/cache";

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
                    eRel => eRel.typeId === rel.typeId && eRel.fromId === rel.fromId && eRel.toId === rel.toId
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

export function fromApiRelationships(metadata: RelationshipMetadata, teiApi: TrackedEntityInstanceApi): Relationship[] {
    return _(teiApi.relationships)
        .map((relApi): Relationship | null => {
            if (!relApi.from.trackedEntityInstance || !relApi.to.trackedEntityInstance) return null;
            const relationshipType = metadata.relationshipTypes.find(rtype => rtype.id === relApi.relationshipType);
            if (!relationshipType) {
                console.error(`No relationship found for relationship ${relApi.relationship}`);
                return null;
            }

            // DB may have invalid or even swapped from/to TEIs, check the validity of A/B or B/A
            const fromToRelationship =
                getFromToRelationship(relationshipType, relApi.from, relApi.to) ||
                getFromToRelationship(relationshipType, relApi.to, relApi.from);

            if (!fromToRelationship) {
                const msg = `${relApi.from.trackedEntityInstance} -> ${relApi.to.trackedEntityInstance}`;
                console.error(`No valid TEIs for relationship ${relApi.relationship}: ${msg}`);
                return null;
            }

            return {
                id: relApi.relationship,
                typeId: relApi.relationshipType,
                typeName: relApi.relationshipName,
                ...fromToRelationship,
            };
        })
        .compact()
        .value();
}

function getFromToRelationship(
    relationshipType: RelationshipType,
    relItem1: RelationshipItemApi,
    relItem2: RelationshipItemApi
): { fromId: Id; toId: Id } | null {
    const teiId1 = relItem1.trackedEntityInstance?.trackedEntityInstance;
    const teiId2 = relItem2.trackedEntityInstance?.trackedEntityInstance;
    if (!teiId1 || !teiId2) return null;

    const areItemsValid =
        _.some(relationshipType.constraints.from.teis, tei => tei.id === teiId1) &&
        _.some(relationshipType.constraints.to.teis, tei => tei.id === teiId2);

    return areItemsValid ? { fromId: teiId1, toId: teiId2 } : null;
}

interface Program {
    id: Id;
    trackedEntityType: Ref;
}

export interface RelationshipMetadata {
    relationshipTypes: RelationshipType[];
}

const teiType = "TRACKED_ENTITY_INSTANCE" as const;

export async function getTrackerProgramMetadata(program: Program, api: D2Api): Promise<RelationshipMetadata> {
    const { trackedEntityTypes, relationshipTypes: allRelationshipTypes } = await api.metadata
        .get({
            trackedEntityTypes: { fields: { id: true, name: true } },
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
        const relationshipHasTeiConstraints =
            fromConstraint.relationshipEntity === teiType && toConstraint.relationshipEntity === teiType;

        const isProgramAssociatedWithSomeConstraint =
            isProgramAssociatedWithTeiConstraint(program, fromConstraint) ||
            isProgramAssociatedWithTeiConstraint(program, toConstraint);

        return relationshipHasTeiConstraints && isProgramAssociatedWithSomeConstraint;
    });

    const relationshipTypesWithTeis = await promiseMap(relationshipTypes, async relType => {
        const { fromConstraint, toConstraint } = relType;
        if (fromConstraint.relationshipEntity !== teiType || toConstraint.relationshipEntity !== teiType) return null;

        const constraints: RelationshipType["constraints"] = {
            from: await getTeisForConstraint(api, trackedEntityTypes, fromConstraint),
            to: await getTeisForConstraint(api, trackedEntityTypes, toConstraint),
        };

        return { id: relType.id, name: relType.name, constraints };
    });

    return { relationshipTypes: _.compact(relationshipTypesWithTeis) };
}

interface TeiIdsResponse {
    trackedEntityInstances: Ref[];
}

async function getTeisForConstraint_(
    api: D2Api,
    trackedEntityTypes: NamedRef[],
    constraint: Extract<D2RelationshipConstraint, { relationshipEntity: "TRACKED_ENTITY_INSTANCE" }>
): Promise<RelationshipConstraint> {
    const trackedEntityTypesById = _.keyBy(trackedEntityTypes, obj => obj.id);

    const query: TrackedEntityInstancesRequest = {
        ouMode: "CAPTURE",
        order: "created:asc",
        program: constraint.program?.id,
        // Program and tracked entity cannot be specified simultaneously
        trackedEntityType: constraint.program ? undefined : constraint.trackedEntityType.id,
        pageSize: 1e6,
        totalPages: true,
        fields: "trackedEntityInstance~rename(id)",
    };

    const { trackedEntityInstances } = (await api.get("/trackedEntityInstances", query).getData()) as TeiIdsResponse;

    const teis = _.sortBy(trackedEntityInstances, tei => tei.id.toLowerCase());
    const name = trackedEntityTypesById[constraint.trackedEntityType.id]?.name || "Unknown";

    return { name, program: constraint.program, teis };
}

const getTeisForConstraint = memoizeAsync(getTeisForConstraint_);

function isProgramAssociatedWithTeiConstraint(program: Program, constraint: D2RelationshipConstraint): boolean {
    return (
        constraint.relationshipEntity === teiType &&
        constraint.trackedEntityType.id === program.trackedEntityType.id &&
        (!constraint.program || constraint.program.id === program.id)
    );
}
