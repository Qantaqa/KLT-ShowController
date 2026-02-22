import type { AppSettingsProfile } from '../store/useShowStore'

export const getPdfFileUrl = (pdfPath: string, isElectron: boolean, appSettings: AppSettingsProfile) => {
    if (!pdfPath) return ''
    const normalizedUrl = pdfPath.replace(/\\/g, '/')

    if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('ledshow-file:')) {
        return normalizedUrl
    }

    if (isElectron) {
        return `ledshow-file:///${normalizedUrl.replace(/^\/+/, '')}`
    } else {
        const socketHost = window.location.hostname
        const socketPort = appSettings?.serverPort || 3001
        const filePort = socketPort + 1
        return `http://${socketHost}:${filePort}/script?path=${encodeURIComponent(pdfPath)}`
    }
}

export const getPdfCleanUrl = (fileUrl: string, page: number) => {
    if (!fileUrl) return ''
    const separator = fileUrl.includes('#') ? '&' : '#'
    return `${fileUrl}${separator}page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`
}
