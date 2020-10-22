import _ from "lodash";
import { Id, Ref } from "./ReferenceObject";
import { Relationship } from "./Relationship";

export interface TrackedEntityInstance {
    program: Ref;
    id: Id;
    orgUnit: Ref;
    disabled: boolean;
    attributeValues: AttributeValue[];
    enrollment: Enrollment | undefined;
    relationships: Relationship[];
}

export interface Enrollment {
    id?: Id;
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
    optionSet?: { id: Id; options: Array<{ id: string; code: string }> };
}

export function getRelationships(trackedEntityInstances: TrackedEntityInstance[]): Relationship[] {
    return _(trackedEntityInstances)
        .flatMap(tei => tei.relationships)
        .uniqWith(_.isEqual)
        .value();
}

export function isRelationshipValid(relationship: Relationship): boolean {
    return !!(
        relationship &&
        (relationship.typeId || relationship.typeName) &&
        relationship.fromId &&
        relationship.toId
    );
}
