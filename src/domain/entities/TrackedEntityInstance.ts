import _ from "lodash";
import { Id, Ref } from "./ReferenceObject";
import { Relationship } from "./Relationship";

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
    optionIdOrValue: string;
}

export interface Program {
    id: Id;
    attributes: Attribute[];
}

export interface Attribute {
    id: Id;
    valueType: string;
    optionSet: { id: Id; options: Array<{ id: string; code: string }> };
}

export function getRelationships(trackedEntityInstances: TrackedEntityInstance[]): Relationship[] {
    return _(trackedEntityInstances)
        .flatMap(tei => tei.relationships)
        .uniqWith(_.isEqual)
        .value();
}
