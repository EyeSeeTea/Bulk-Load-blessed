export function removeCharacters(value: unknown): string {
    return String(value).replace(/[^a-zA-Z0-9]/g, "")
}
