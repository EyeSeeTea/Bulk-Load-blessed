import { AggregatedPackage } from "./AggregatedPackage";
import { EventsPackage } from "./EventsPackage";
import { Id } from "./ReferenceObject";
import { Template } from "./Template";

export interface TemplateProvider {
    templates: Template[];
    downloadTemplate(id: Id): void;
    uploadTemplate(id: Id, file: File): AggregatedPackage | EventsPackage;
}
