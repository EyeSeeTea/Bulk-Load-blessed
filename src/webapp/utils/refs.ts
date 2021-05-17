import { NamedRef } from "../../domain/entities/ReferenceObject";
import { SelectOption } from "../components/select/Select";

export function getSelectOptionsFromNamedRefs<Model extends NamedRef>(models: Model[]): SelectOption[] {
    return models.map(({ id, name }) => ({ value: id, label: name }));
}

export function getMultiSelectorOptionsFromNamedRefs<Model extends NamedRef>(
    models: Model[]
): Array<{ value: string; text: string }> {
    return models.map(({ id, name }) => ({ value: id, text: name }));
}
