interface D2ObjectWithAttributes {
    attributeValues?: Array<{ value?: string; attribute?: { code?: string } }>;
}

export function getObjectVersion(object: D2ObjectWithAttributes): string | null {
    const attributeValues = object.attributeValues || [];
    const versionAttributeValue = attributeValues.find(
        attributeValue => attributeValue.attribute && attributeValue.attribute.code === "VERSION"
    );
    return versionAttributeValue && versionAttributeValue.value ? versionAttributeValue.value.trim() : null;
}
