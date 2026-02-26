import type { AppSettingsProfile } from '../types/show'

/**
 * Returns an HTTP URL for the PDF file served by the Electron file server.
 * Used for backward compatibility (e.g. any code that still needs a URL).
 * 
 * The PdfViewer component in Electron loads PDFs directly via fs.readFileSync
 * and does NOT use this function. Remote clients receive a placeholder UI.
 */
export const getPdfFileUrl = (pdfPath: string, isElectron: boolean, appSettings: AppSettingsProfile) => {
    if (!pdfPath) return ''
    if (pdfPath.startsWith('data:') || pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
        return pdfPath
    }
    const socketHost = isElectron ? 'localhost' : window.location.hostname
    const socketPort = appSettings?.serverPort || 3001
    const filePort = socketPort + 1
    return `http://${socketHost}:${filePort}/script?path=${encodeURIComponent(pdfPath)}`
}

/**
 * Builds an iframe-compatible PDF URL with page anchors (kept for backward compat).
 */
export const getPdfCleanUrl = (fileUrl: string, page: number) => {
    if (!fileUrl) return ''
    const separator = fileUrl.includes('#') ? '&' : '#'
    return `${fileUrl}${separator}page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`
}
