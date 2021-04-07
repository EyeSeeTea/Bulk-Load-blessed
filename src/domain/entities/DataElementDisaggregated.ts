import { Id } from "./ReferenceObject";

const idSeparator = "-";

export interface DataElementDisaggregated {
    id: Id;
    categoryOptionComboId?: Id;
}

export type DataElementDisaggregatedId = string; // ${de.id}-${coc.id}

export function getDataElementDisaggregatedId(de: DataElementDisaggregated): DataElementDisaggregatedId {
    return [de.id, de.categoryOptionComboId].filter(Boolean).join(idSeparator);
}

export function getDataElementDisaggregatedById(id: string): DataElementDisaggregated {
    const [dataElementId = "", cocId] = id.split(idSeparator, 2);
    return cocId ? { id: dataElementId, categoryOptionComboId: cocId } : { id: dataElementId };
}
