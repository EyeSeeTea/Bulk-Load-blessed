interface DownloadFileOptions {
    filename: string;
    data: string | Buffer | Blob;
    mimeType: string;
}

export function downloadFile(options: DownloadFileOptions): void {
    const { filename, data, mimeType } = options;
    const blob = new Blob([data], { type: mimeType });
    const element = document.querySelector<HTMLAnchorElement>("#download") || document.createElement("a");
    element.id = "download-file";
    element.href = window.URL.createObjectURL(blob);
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
}
