export const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = error => reject(error);
    });
};

export const fromBase64 = async (string: string): Promise<File> => {
    const response = await fetch(string);
    const buffer = await response.arrayBuffer();
    return new File([buffer], "Logo");
};

export function toBuffer(arrayBuffer: ArrayBuffer) {
    const buf = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}
