import { TemplateReference } from "./TemplateReference";
import { NamedRef } from "./ReferenceObject";

export interface TemplateSharings {
    sharings: TemplateSharing[];
}

interface TemplateSharing {
    object: TemplateReference;
    sharing: Sharing;
}

interface Sharing {
    users: NamedRef[];
    userGroups: NamedRef[];
}
