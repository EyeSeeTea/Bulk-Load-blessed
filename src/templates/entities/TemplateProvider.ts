import { AggregatedPackage } from "./AggregatedPackage";
import { EventsPackage } from "./EventsPackage";
import { Id } from "./ReferenceObject";
import { DataSetTemplate, ProgramTemplate, Template, TemplateType } from "./Template";

export type TemplateProvider = DataSetTemplateProvider | ProgramTemplateProvider;

export interface GenericTemplateProvider {
    type: TemplateType;
    templates: Template[];
    downloadTemplate(id: Id): void;
    uploadTemplate(id: Id, file: File): AggregatedPackage | EventsPackage;
}

export interface DataSetTemplateProvider extends GenericTemplateProvider {
    type: "dataSet";
    templates: DataSetTemplate[];
    uploadTemplate(id: Id, file: File): AggregatedPackage;
}

export interface ProgramTemplateProvider extends GenericTemplateProvider {
    type: "program";
    templates: ProgramTemplate[];
    uploadTemplate(id: Id, file: File): EventsPackage;
}
