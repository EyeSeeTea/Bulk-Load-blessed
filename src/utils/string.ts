export function removeCharacters(value: unknown): string {
    return value === undefined ? "" : String(value).replace(/[^a-zA-Z0-9.]/g, "");
}
