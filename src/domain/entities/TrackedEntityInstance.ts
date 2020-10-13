import { Id, Ref } from "./ReferenceObject";
import _ from "lodash";

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
    date: string;
}

export interface AttributeValue {
    id: Id;
    valueType: string;
    value: string;
}

export interface Program {
    id: Id;
    attributes: Attribute[];
}

export interface Attribute {
    id: Id;
    name: string;
}

export interface Relationship {
    typeId: Id;
    typeName: string;
    fromId: Id;
    toId: Id;
}

export function getRelationships(trackedEntityInstances: TrackedEntityInstance[]): Relationship[] {
    return _(trackedEntityInstances)
        .flatMap(tei => tei.relationships)
        .uniqWith(_.isEqual)
        .value();
}
