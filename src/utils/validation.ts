import _ from "lodash";
import { Validation } from "../domain/entities/Validation";
import i18n from "../locales";

const translations: Record<string, (namespace: unknown) => string> = {
    isBlank: (namespace: unknown) => i18n.t("Field {{field}} cannot be blank", namespace),
    isEmpty: (namespace: unknown) => i18n.t("You need to select at least one {{element}}", namespace),
};

export async function getValidationMessages(validation: Validation, validationKeys = null): Promise<string[]> {
    return _(validation)
        .at(validationKeys || _.keys(validation))
        .flatten()
        .compact()
        .map(error => {
            const translation = translations[error.key];
            if (translation) {
                return i18n.t(translation(error.namespace));
            } else {
                return `Missing translation: ${error.key}`;
            }
        })
        .value();
}
