import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft, ChevronRight, Link as LinkIcon, Sun, Moon } from 'lucide-react'
import { useShowStore } from '../store/useShowStore'
import { getPdfFileUrl, getPdfCleanUrl } from '../services/pdf-service'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const PdfViewer: React.FC = () => {
    const activeShow = useShowStore((state) => state.activeShow)
    const appSettings = useShowStore((state) => state.appSettings)
    const pageNumber = useShowStore((state) => state.activeShow?.viewState?.currentScriptPage || 1)
    const setCurrentScriptPage = useShowStore((state) => state.setCurrentScriptPage)
    const isLocked = useShowStore((state) => state.isLocked)
    const selectedEventIndex = useShowStore((state) => state.selectedEventIndex)
    const updateEvent = useShowStore((state) => state.updateEvent)
    const addToast = useShowStore((state) => state.addToast)

    const [shouldInvert, setShouldInvert] = React.useState<boolean>(activeShow?.invertScriptColors || true)
    const [isDragging, setIsDragging] = React.useState(false)
    const [hoverPage, setHoverPage] = React.useState<number | null>(null)
    const [scrubValue, setScrubValue] = React.useState(pageNumber)
    const totalPages = activeShow?.totalPages || 0

    const scrollRef = React.useRef<HTMLDivElement>(null)
    const lastWheelTime = React.useRef(0)

    // Sync scrub value when page changes externally
    React.useEffect(() => {
        if (!isDragging) setScrubValue(pageNumber)
    }, [pageNumber, isDragging])

    const pdfPath = activeShow?.pdfPath || ''
    const isElectron = !!(window as any).require
    const fileUrl = getPdfFileUrl(pdfPath, isElectron, appSettings)
    const cleanUrl = getPdfCleanUrl(fileUrl, isDragging ? scrubValue : pageNumber)

    const handleNextPage = React.useCallback(() => {
        if (totalPages > 0 && pageNumber >= totalPages) return
        setCurrentScriptPage(pageNumber + 1)
    }, [pageNumber, setCurrentScriptPage, totalPages])

    const handlePrevPage = React.useCallback(() => {
        if (pageNumber > 1) {
            setCurrentScriptPage(pageNumber - 1)
        }
    }, [pageNumber, setCurrentScriptPage])

    const handleWheel = (e: React.WheelEvent) => {
        const now = Date.now()
        if (now - lastWheelTime.current < 200) return // Slightly lower cooldown

        // Use a smaller threshold or no threshold if it feels broken
        if (Math.abs(e.deltaY) < 5) return

        if (e.deltaY > 0) {
            handleNextPage()
            lastWheelTime.current = now
        } else if (e.deltaY < 0) {
            handlePrevPage()
            lastWheelTime.current = now
        }
    }

    const handleScrub = (e: React.MouseEvent | React.TouchEvent) => {
        if (!scrollRef.current || totalPages <= 0) return
        const rect = scrollRef.current.getBoundingClientRect()
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY
        const pos = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        const page = Math.max(1, Math.min(totalPages, Math.round(pos * (totalPages - 1)) + 1))
        setScrubValue(page)
        setHoverPage(page)
    }

    const handleScrubEnd = () => {
        if (isDragging) {
            setCurrentScriptPage(scrubValue)
            setIsDragging(false)
            setHoverPage(null)
        }
    }

    const handleBindToCue = () => {
        if (selectedEventIndex >= 0) {
            updateEvent(selectedEventIndex, { scriptPg: pageNumber })
            addToast(`Pagina ${pageNumber} gekoppeld aan geselecteerde cue`, 'info')
        } else {
            alert("No cue selected! Select a cue in the grid first.")
        }
    }

    if (!pdfPath || pdfPath === '/') {
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
        <div
            className="w-full h-full flex flex-col gap-0 overflow-hidden relative group select-none bg-black"
            onMouseUp={handleScrubEnd}
            onMouseLeave={handleScrubEnd}
        >
            {/* PDF Content Area */}
            <div
                className="flex-1 w-full bg-black overflow-hidden relative border-none"
                onWheel={handleWheel}
                onMouseMove={(e) => isDragging && handleScrub(e)}
            >
                {/* 
                    Transparent Overlay: 
                    Blocks native interaction with PDF and captures events.
                    Only active when not dragging to allow scrubbing.
                */}
                {!isDragging && (
                    <div
                        className="absolute inset-0 z-10 cursor-ns-resize"
                        onMouseDown={() => {
                            // If clicking far right, don't trigger resize cursor? 
                            // Actually cursor-ns-resize is for the whole area.
                        }}
                    />
                )}

                <iframe
                    key={pageNumber} // Re-add key to force reload and avoid "stuck" pages
                    src={cleanUrl}
                    className={cn(
                        "w-full h-full transition-all duration-300 pointer-events-none bg-black border-none",
                        shouldInvert && "grayscale invert opacity-90 brightness-110 contrast-125"
                    )}
                    style={{
                        filter: shouldInvert ? 'grayscale(100%) invert(100%) opacity(0.9) brightness(1.1) contrast(1.25)' : 'none',
                        border: 'none',
                        background: 'black'
                    }}
                    title="Script"
                />

                {/* Custom Vertical Scrollbar */}
                {totalPages > 0 && (
                    <div
                        ref={scrollRef}
                        className="absolute right-0 top-0 bottom-0 w-8 z-30 group/scroll cursor-pointer"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDragging(true)
                            handleScrub(e)
                        }}
                    >
                        {/* Track */}
                        <div className="absolute inset-y-4 right-3 w-1.5 bg-white/5 rounded-full border border-white/5 group-hover/scroll:bg-white/10 transition-colors" />

                        {/* Thumb */}
                        <div
                            className={cn(
                                "absolute right-3 w-1.5 bg-primary rounded-full transition-all shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]",
                                isDragging ? "scale-x-150" : "opacity-40 group-hover/scroll:opacity-100"
                            )}
                            style={{
                                top: `${((isDragging ? scrubValue : pageNumber) - 1) / (totalPages > 1 ? totalPages - 1 : 1) * 85 + 5}%`,
                                height: '24px',
                                marginTop: '-12px'
                            }}
                        />

                        {/* Hover/Drag Popup */}
                        {(hoverPage !== null || isDragging) && (
                            <div
                                className="absolute right-10 px-3 py-1.5 bg-primary text-white text-xs font-black rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                                style={{
                                    top: `${((isDragging ? scrubValue : (hoverPage || pageNumber)) - 1) / (totalPages > 1 ? totalPages - 1 : 1) * 85 + 5}%`,
                                    transform: 'translateY(-50%)'
                                }}
                            >
                                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rotate-45" />
                                {isDragging ? scrubValue : hoverPage}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Script Toolbar */}
            <div className="h-12 bg-[#0a0a0a] border-t border-white/10 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-black/20 rounded-xl border border-white/10 p-0.5 shadow-inner">
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrevPage(); }}
                            disabled={pageNumber <= 1}
                            title="Vorige Pagina"
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 text-primary"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-3 min-w-[80px] text-center border-x border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mr-2">Pagina</span>
                            <span className="text-xs font-mono font-bold text-white/90">{pageNumber}</span>
                            {totalPages > 0 && <span className="text-[10px] font-bold text-white/20 ml-1">/ {totalPages}</span>}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNextPage(); }}
                            disabled={totalPages > 0 && pageNumber >= totalPages}
                            title="Volgende Pagina"
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 text-primary"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Dark/Light Toggle */}
                    <button
                        onClick={() => setShouldInvert(!shouldInvert)}
                        className={cn(
                            "flex items-center gap-3 h-9 px-4 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest bg-black/20 border-white/10 text-white/40 hover:bg-white/5",
                            shouldInvert && "border-primary/20"
                        )}
                    >
                        {shouldInvert ? <Moon className="w-3.5 h-3.5 text-primary" /> : <Sun className="w-3.5 h-3.5 text-primary" />}
                        {shouldInvert ? 'Donker' : 'Licht'}
                    </button>

                    {!isLocked && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleBindToCue(); }}
                            disabled={selectedEventIndex === -1}
                            className="flex items-center gap-3 h-9 px-4 bg-black/20 hover:bg-white/5 border border-white/10 rounded-xl transition-all group disabled:opacity-20 disabled:grayscale text-white/40"
                        >
                            <LinkIcon className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Koppel aan cue</span>
                        </button>
                    )}
                </div>
            </div>
        </div >
    )
}

export default PdfViewer
