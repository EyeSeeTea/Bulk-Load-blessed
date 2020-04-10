import { AggregatedPackage } from "./AggregatedPackage";
import { EventsPackage } from "./EventsPackage";
import { Id } from "./ReferenceObject";

export type TemplateType = "dataSet" | "program";

export interface Template {
    id: Id;
    name: string;
    type: TemplateType;
    write(): Blob;
    read(file: File): AggregatedPackage;
    read(file: File): EventsPackage;
}
