export const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = error => reject(error);
    });
};

export const getStringFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file, "utf-8");
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = error => reject(error);
    });
};

export const fromBase64 = async (uri: string, filename?: string): Promise<File> => {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new File([buffer], filename || "Logo");
};

export function getBlobFromBase64(contents: string): Blob {
    const buffer = Buffer.from(contents, "base64");
    return new Blob([buffer]);
}
