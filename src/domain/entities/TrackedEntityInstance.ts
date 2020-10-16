import _ from "lodash";
import { Id, Ref } from "./ReferenceObject";
import { Relationship } from "./Relationship";
import { getUid } from "../../data/dhis2-uid";

export interface TrackedEntityInstance {
    program: Program;
    id: Id;
    orgUnit: Ref;
    disabled: boolean;
    attributeValues: AttributeValue[];
    enrollment: Enrollment | undefined;
    relationships: Relationship[];
}

export interface Enrollment {
    enrollmentDate: string;
    incidentDate: string;
}

export interface AttributeValue {
    attribute: Attribute;
    value: string;
    optionId?: Id;
}

export interface Program {
    id: Id;
    trackedEntityType: Ref;
    attributes: Attribute[];
}

export interface Attribute {
    id: Id;
    valueType: string;
    optionSet?: { id: Id; options: Array<{ id: string; code: string }> };
}

export function getRelationships(trackedEntityInstances: TrackedEntityInstance[]): Relationship[] {
    return _(trackedEntityInstances)
        .flatMap(tei => tei.relationships)
        .uniqWith(_.isEqual)
        .value();
}

export function updateTeiIds(
    trackedEntityInstances: TrackedEntityInstance[]
): TrackedEntityInstance[] {
    return trackedEntityInstances.map(tei => ({ ...tei, id: getUid(tei.id) }));
}

export function isRelationshipValid(relationship: Relationship): boolean {
    return !!(relationship.id && relationship.typeId && relationship.fromId && relationship.toId);
}
