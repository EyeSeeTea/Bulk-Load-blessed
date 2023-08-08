import JSZip from "jszip";
import _ from "lodash";
import { FileResource } from "../domain/entities/FileResource";

type ExtensionName = string;

const ALLOWED_IMAGES = ["png", "jpg", "jpeg", "svg"];
const XLSX_EXTENSION = "xlsx";
const MIME_TYPES_BY_EXTENSION: Record<ExtensionName, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
};

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

export const fromBase64 = async (uri: string, filename?: string, options?: { mimeType: string }): Promise<File> => {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new File([buffer], filename || "Logo", { type: options?.mimeType });
};

export function getBlobFromBase64(contents: string): Blob {
    const buffer = Buffer.from(contents, "base64");
    return new Blob([buffer]);
}

export function isExcelFile(fileName: string): boolean {
    return getExtensionFile(fileName) === XLSX_EXTENSION;
}

function getExtensionFile(fileName: string) {
    return _(fileName).split(".").last()?.toLowerCase();
}

export async function extractExcelFromZip(file: File) {
    const zip = new JSZip();

    const zipContent = await zip.loadAsync(file);

    const fileNames = _(zipContent.files).keys().value();

    const excelFileName =
        _(fileNames).find(fileName => {
            const extensionFile = _(fileName).split(".").last()?.toLowerCase() || "";
            return extensionFile === XLSX_EXTENSION;
        }) || "";

    return await zipContent.file(excelFileName)?.async("blob");
}

export async function extractImagesFromZip(file: File): Promise<FileResource[]> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const fileNames = _(zipContent.files).keys().value();

    const allowedFiles = _(fileNames)
        .map(fileName => {
            const extensionFile = _(fileName).split(".").last()?.toLowerCase() || "";
            const name = _(fileName).split("/").last() || "";
            return ALLOWED_IMAGES.includes(extensionFile) ? { name, fullPath: fileName } : undefined;
        })
        .compact()
        .value();

    const promises = _(allowedFiles)
        .map(allowedFile => {
            return zipContent.file(allowedFile.fullPath)?.async("blob");
        })
        .value();

    const filesContents = await Promise.all(promises);

    return _(filesContents)
        .map((fileContent, index) => {
            if (!fileContent) return undefined;
            const name = allowedFiles[index]?.name || "";
            return {
                id: "",
                data: fileContent.slice(0, fileContent.size, MIME_TYPES_BY_EXTENSION[getExtensionFile(name) as string]),
                name,
            };
        })
        .compact()
        .value();
}

export async function getExcelOrThrow(file: File) {
    const isExcel = isExcelFile(file.name);
    const excelFile = isExcel ? file : await extractExcelFromZip(file);
    if (excelFile) {
        return excelFile;
    } else {
        throw new Error("Zip file does not have a xlsx file");
    }
}

export const xlsxMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
