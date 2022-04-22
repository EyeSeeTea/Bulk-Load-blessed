import { Id } from "./ReferenceObject";

export interface DataFormTemplate {
    relationships: Record<DataFormId, Array<{ templateId: TemplateId }>>;
}

type DataFormId = Id;
type TemplateId = Id;
