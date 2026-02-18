import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useShowStore } from '../store/useShowStore'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface PdfViewerProps {
    pdfUrl: string
    pageNumber: number
    invertScriptColors?: boolean
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, pageNumber, invertScriptColors = true }) => {
    const [shouldInvert, setShouldInvert] = React.useState(invertScriptColors)
    const appSettings = useShowStore(s => s.appSettings)

    // Sync state if prop changes
    React.useEffect(() => {
        setShouldInvert(invertScriptColors)
    }, [invertScriptColors])

    // Use ledshow-file protocol for local files, or the /script streamer for remote clients
    const normalizedUrl = pdfUrl.replace(/\\/g, '/');
    let fileUrl = '';

    const isElectron = !!(window as any).require;
    // The host IP: on remote clients this is the server's IP address
    const socketHost = window.location.hostname;

    if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('ledshow-file:')) {
        fileUrl = normalizedUrl;
    } else if (isElectron) {
        // We are on the host, use the custom Electron protocol
        fileUrl = `ledshow-file:///${normalizedUrl.replace(/^\/+/, '')}`;
    } else {
        // We are on a remote notebook, use the file streamer from the host
        // FILE_PORT = SOCKET_PORT + 1 (e.g. 3001 + 1 = 3002)
        const socketPort = appSettings?.serverPort || 3001;
        const filePort = socketPort + 1;
        fileUrl = `http://${socketHost}:${filePort}/script?path=${encodeURIComponent(pdfUrl)}`;
    }

    const cleanUrl = `${fileUrl}${fileUrl.includes('#') ? '&' : '#'}page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`

    if (!pdfUrl || pdfUrl === '/') {
        // If the URL is empty or pointing to the app root, we show a placeholder
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-muted-foreground p-8 text-center">
                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl max-w-sm">
                    <h3 className="text-lg font-bold text-white mb-2">Geen script ingeladen</h3>
                    <p className="text-xs leading-relaxed opacity-60">
                        Gebruik de "Project" knop om een PDF script te selecteren voor deze productie.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col items-center gap-2 overflow-hidden relative group">
            <div className="w-full h-full bg-[#1a1a1a] rounded-lg overflow-hidden border border-white/10 glass shadow-2xl relative">
                <iframe
                    src={cleanUrl}
                    className={cn(
                        "w-full h-full transition-all duration-500",
                        shouldInvert && "grayscale invert opacity-90 brightness-110 contrast-125"
                    )}
                    title="Script"
                />
            </div>

            {/* Quick Toggle for Inversion */}
            <button
                onClick={() => setShouldInvert(!shouldInvert)}
                title={shouldInvert ? 'Originele kleuren tonen' : 'Dark mode script'}
                className="absolute bottom-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-widest"
            >
                {shouldInvert ? 'Original Colors' : 'Dark Mode Script'}
            </button>
        </div>
    )
}

export default PdfViewer
