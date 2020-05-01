export function stringOrNumber(value: string | number | undefined): string | number | undefined {
    const validNumber = !isNaN(Number(value));
    return validNumber ? Number(value) : value;
}
