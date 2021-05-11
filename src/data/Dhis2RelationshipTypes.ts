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
import { D2Api, Ref, Id, D2RelationshipType } from "../types/d2-api";
import { promiseMap } from "../utils/promises";
import { NamedRef } from "../domain/entities/ReferenceObject";
import { RelationshipType, RelationshipConstraint } from "../domain/entities/RelationshipType";
import { memoizeAsync } from "../utils/cache";

type D2RelationshipConstraint =
    | {
          relationshipEntity: "TRACKED_ENTITY_INSTANCE";
          trackedEntityType: Ref;
          program?: Ref;
      }
    | {
          relationshipEntity: "PROGRAM_INSTANCE";
          program: Ref;
      }
    | {
          relationshipEntity: "PROGRAM_STAGE_INSTANCE";
          program: Ref;
      }
    | {
          relationshipEntity: "PROGRAM_STAGE_INSTANCE";
          programStage: Ref;
      };

type RelationshipTypesById = Record<Id, Pick<D2RelationshipType, "id" | "toConstraint" | "fromConstraint">>;

export function getApiRelationships(
    existingTei: TrackedEntityInstance | undefined,
    relationships: Relationship[],
    relationshipTypesById: RelationshipTypesById
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

            const fromConstraint = getRelationshipConstraint(rel, relationshipTypesById, "from");
            const toConstraint = getRelationshipConstraint(rel, relationshipTypesById, "to");

            if (!fromConstraint || !toConstraint) return;

            const relApi: RelationshipApi = {
                relationship: relationshipId,
                relationshipType: rel.typeId,
                relationshipName: rel.typeName,
                from: fromConstraint,
                to: toConstraint,
            };
            return relApi;
        })
        .compact()
        .value();
    return apiRelationships;
}

function getRelationshipConstraint(
    relationship: Relationship,
    relationshipTypesById: RelationshipTypesById,
    key: "from" | "to"
) {
    const relationshipType = relationshipTypesById[relationship.typeId];
    if (!relationshipType) return;

    const [constraint, id] =
        key === "from"
            ? [relationshipType.fromConstraint, relationship.fromId]
            : [relationshipType.toConstraint, relationship.toId];

    return constraint.relationshipEntity === "TRACKED_ENTITY_INSTANCE"
        ? { trackedEntityInstance: { trackedEntityInstance: id } }
        : { event: { event: id } };
}

export function fromApiRelationships(metadata: RelationshipMetadata, teiApi: TrackedEntityInstanceApi): Relationship[] {
    return _(teiApi.relationships)
        .map((relApi): Relationship | null => {
            const relationshipType = metadata.relationshipTypes.find(relType => relType.id === relApi.relationshipType);

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
    const fromId = getRelationshipId(relationshipType.constraints.from, relItem1);
    const toId = getRelationshipId(relationshipType.constraints.to, relItem2);

    return fromId && toId ? { fromId, toId } : null;
}

function getRelationshipId(constraint: RelationshipConstraint, relItem: RelationshipItemApi): Id | undefined {
    switch (constraint.type) {
        case "tei": {
            const teiId = relItem.trackedEntityInstance?.trackedEntityInstance;
            const teiIsValid = _.some(constraint.teis, tei => tei.id === teiId);
            return teiIsValid ? teiId : undefined;
        }
        case "eventInProgram":
            return relItem.event?.event;
        default:
            return undefined;
    }
}

interface Program {
    id: Id;
    trackedEntityType: Ref;
}

export interface RelationshipMetadata {
    relationshipTypes: RelationshipType[];
}

export async function getTrackerProgramMetadata(program: Program, api: D2Api): Promise<RelationshipMetadata> {
    const { trackedEntityTypes, relationshipTypes: allRelationshipTypes, programs } = await api.metadata
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
            programs: { fields: { id: true, name: true, programStages: { id: true, name: true } } },
        })
        .getData();

    const relationshipTypesWithTeis = await promiseMap(allRelationshipTypes, async relType => {
        const isProgramAssociatedWithSomeConstraint =
            isProgramAssociatedWithTeiConstraint(program, relType.fromConstraint) ||
            isProgramAssociatedWithTeiConstraint(program, relType.toConstraint);

        if (!isProgramAssociatedWithSomeConstraint) return;

        const fromConstraint = await getConstraint(api, trackedEntityTypes, programs, relType.fromConstraint);
        const toConstraint = await getConstraint(api, trackedEntityTypes, programs, relType.toConstraint);

        return fromConstraint && toConstraint
            ? { id: relType.id, name: relType.name, constraints: { from: fromConstraint, to: toConstraint } }
            : undefined;
    });

    return { relationshipTypes: _.compact(relationshipTypesWithTeis) };
}

type ProgramInfo = NamedRef & { programStages: NamedRef[] };

async function getConstraint_(
    api: D2Api,
    trackedEntityTypes: NamedRef[],
    programs: ProgramInfo[],
    constraint: D2RelationshipConstraint
): Promise<RelationshipConstraint | undefined> {
    const programsById = _.keyBy(programs, program => program.id);
    const programsDataByProgramStageId = _(programs)
        .flatMap(program =>
            program.programStages.map(programStage => {
                const programsData = { program, programStage };
                return [programStage.id, programsData] as [Id, typeof programsData];
            })
        )
        .fromPairs()
        .value();

    switch (constraint.relationshipEntity) {
        case "TRACKED_ENTITY_INSTANCE":
            return getConstraintForTypeTei(api, trackedEntityTypes, constraint);
        case "PROGRAM_STAGE_INSTANCE": {
            if ("program" in constraint) {
                const program = programsById[constraint.program.id];
                return program ? { type: "eventInProgram", program } : undefined;
            } else {
                const programsData = programsDataByProgramStageId[constraint.programStage.id];
                return programsData ? { type: "eventInProgram", ...programsData } : undefined;
            }
        }
    }
}

const getConstraint = memoizeAsync(getConstraint_);

interface TeiIdsResponse {
    trackedEntityInstances: Ref[];
}

async function getConstraintForTypeTei(
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

    return { type: "tei", name, program: constraint.program, teis };
}

function isProgramAssociatedWithTeiConstraint(program: Program, constraint: D2RelationshipConstraint): boolean {
    switch (constraint.relationshipEntity) {
        case "TRACKED_ENTITY_INSTANCE":
            return (
                constraint.trackedEntityType.id === program.trackedEntityType.id &&
                (!constraint.program || constraint.program.id === program.id)
            );
        case "PROGRAM_STAGE_INSTANCE":
            return true;
        default:
            return false;
    }
}
