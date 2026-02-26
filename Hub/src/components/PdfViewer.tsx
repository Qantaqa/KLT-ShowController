import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Link as LinkIcon, Sun, Moon } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import { cn } from '../lib/utils'
import * as pdfjsLib from 'pdfjs-dist'
import { networkService } from '../services/network-service'

// Worker is bundled locally in public/ — works offline, no CDN dependency
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

// ---------------------------------------------------------------------------
// RemotePdfViewer — for browser clients (non-Electron)
// Loads PDF via HTTP from the host file server. Free navigation.
// Jumps to page when EVENT_PAGE arrives (event-triggered, not manual host nav).
// ---------------------------------------------------------------------------
const RemotePdfViewer: React.FC<{ pdfPath: string; currentScriptPage: number }> = ({ pdfPath, currentScriptPage }) => {
    const appSettings = useSequencerStore((s) => s.appSettings)

    const [localPage, setLocalPage] = useState(currentScriptPage || 1)
    const [totalPages, setTotalPages] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [shouldInvert, setShouldInvert] = useState(true)
    const [isJumping, setIsJumping] = useState(false)
    const [jumpInput, setJumpInput] = useState('')

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
    const lastWheelTime = useRef(0)
    const lastLoadedPath = useRef('')

    // Load PDF when path or settings change (appSettings may arrive after initial mount)
    useEffect(() => {
        if (!pdfPath) return

        // Build HTTP URL using the SOCKET port (already open for WebSocket)
        // This avoids needing a separate firewall rule for the file server port
        const socketPort = appSettings?.serverPort || 3001
        const host = window.location.hostname || 'localhost'
        const url = `http://${host}:${socketPort}/script?path=${encodeURIComponent(pdfPath)}`

        console.log('[RemotePdfViewer] Loading PDF from URL:', url)

        // Skip if already loaded from the same URL
        if (url === lastLoadedPath.current) return
        lastLoadedPath.current = url

        setIsLoading(true)
        setLoadError(null)

        let cancelled = false
        pdfDocRef.current?.destroy()
        pdfDocRef.current = null

        pdfjsLib.getDocument({ url }).promise
            .then((doc) => {
                if (cancelled) { doc.destroy(); return }
                pdfDocRef.current = doc
                setTotalPages(doc.numPages)
                setIsLoading(false)
                renderPage(doc, Math.min(localPage, doc.numPages))
                console.log('[RemotePdfViewer] PDF loaded successfully, pages:', doc.numPages)
            })
            .catch((err) => {
                if (cancelled) return
                console.error('[RemotePdfViewer] Load error:', err)
                setLoadError('Kon PDF niet laden: ' + (err?.message || String(err)))
                setIsLoading(false)
            })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfPath, appSettings?.serverPort])

    // Follow EVENT_PAGE — jump when host triggers an event-driven page change
    useEffect(() => {
        if (currentScriptPage > 0 && currentScriptPage !== localPage) {
            setLocalPage(currentScriptPage)
            if (pdfDocRef.current) renderPage(pdfDocRef.current, currentScriptPage)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentScriptPage])

    // Re-render when localPage changes via own navigation
    useEffect(() => {
        if (pdfDocRef.current) renderPage(pdfDocRef.current, localPage)
        setJumpInput('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localPage])

    const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
        if (!canvasRef.current) return
        if (renderTaskRef.current) { try { renderTaskRef.current.cancel() } catch { /* noop */ } }

        try {
            const page = await doc.getPage(Math.max(1, Math.min(num, doc.numPages)))
            const canvas = canvasRef.current
            if (!canvas) return
            const containerWidth = canvas.parentElement?.clientWidth || 800
            const scale = containerWidth / page.getViewport({ scale: 1 }).width
            const viewport = page.getViewport({ scale })
            canvas.width = viewport.width
            canvas.height = viewport.height
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            const task = page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport } as any)
            renderTaskRef.current = task
            await task.promise
        } catch (err: any) {
            if (err?.name === 'RenderingCancelledException') return
        }
    }, [])

    const navigateTo = useCallback((page: number) => {
        setLocalPage(Math.max(1, totalPages > 0 ? Math.min(page, totalPages) : page))
    }, [totalPages])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const now = Date.now()
        if (now - lastWheelTime.current < 500 || Math.abs(e.deltaY) < 20) return
        lastWheelTime.current = now
        if (e.deltaY > 0) navigateTo(localPage + 1)
        else navigateTo(localPage - 1)
    }, [localPage, navigateTo])

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const num = parseInt(jumpInput, 10)
        if (!isNaN(num) && num >= 1) navigateTo(num)
        setIsJumping(false)
        setJumpInput('')
    }

    if (!pdfPath || pdfPath === '/') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black/40 text-muted-foreground p-8 text-center">
                <p className="text-xs opacity-40">Geen script ingeladen op de host</p>
            </div>
        )
    }

    if (loadError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black/40 text-red-400 p-8 text-center">
                <p className="text-xs">{loadError}</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-black select-none">
            <div className="flex-1 min-h-0 overflow-hidden bg-black relative" onWheel={handleWheel}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-white/40 text-xs font-mono animate-pulse">PDF laden...</div>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className={cn('w-full block transition-[filter] duration-200', shouldInvert && 'pdf-inverted')}
                />
            </div>

            {/* Simple toolbar — navigation only (no host controls) */}
            <div className="h-12 bg-background border-t border-white/10 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 bg-black/20 rounded-xl border border-white/10 p-0.5">
                    <button onClick={() => navigateTo(localPage - 1)} disabled={localPage <= 1}
                        title="Vorige Pagina"
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 text-primary">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-2 min-w-[80px] text-center border-x border-white/5">
                        {isJumping ? (
                            <form onSubmit={handleJumpSubmit} className="flex items-center">
                                <input autoFocus type="number" min={1} value={jumpInput}
                                    onChange={(e) => setJumpInput(e.target.value)}
                                    onBlur={() => { setIsJumping(false); setJumpInput('') }}
                                    className="w-14 bg-transparent text-center text-xs font-mono font-bold text-white outline-none border-b border-primary"
                                    placeholder={String(localPage)} />
                            </form>
                        ) : (
                            <button onClick={() => { setIsJumping(true); setJumpInput(String(localPage)) }}
                                className="flex items-center gap-1 text-white/90 hover:text-white transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mr-1">Pg</span>
                                <span className="text-xs font-mono font-bold">{localPage}</span>
                                {totalPages > 0 && <span className="text-[10px] font-bold text-white/20 ml-1">/ {totalPages}</span>}
                            </button>
                        )}
                    </div>
                    <button onClick={() => navigateTo(localPage + 1)} disabled={totalPages > 0 && localPage >= totalPages}
                        title="Volgende Pagina"
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 text-primary">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <button onClick={() => setShouldInvert(!shouldInvert)}
                    className={cn('flex items-center gap-2 h-9 px-4 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest bg-black/20 border-white/10 text-white/40',
                        shouldInvert && 'border-primary/20')}>
                    {shouldInvert ? <Moon className="w-3.5 h-3.5 text-primary" /> : <Sun className="w-3.5 h-3.5 text-primary" />}
                    {shouldInvert ? 'Donker' : 'Licht'}
                </button>
            </div>
        </div>
    )
}

const PdfViewer: React.FC = () => {
    const activeShow = useSequencerStore((state) => state.activeShow)
    const pageNumber = useSequencerStore((state) => state.activeShow?.viewState?.currentScriptPage || 1)
    const setCurrentScriptPage = useSequencerStore((state) => state.setCurrentScriptPage)
    const isLocked = useSequencerStore((state) => state.isLocked)
    const selectedEventIndex = useSequencerStore((state) => state.selectedEventIndex)
    const updateEvent = useSequencerStore((state) => state.updateEvent)
    const addToast = useSequencerStore((state) => state.addToast)

    const isElectron = !!(window as any).require

    const [shouldInvert, setShouldInvert] = useState<boolean>(true)
    const [totalPages, setTotalPages] = useState<number>(activeShow?.totalPages || 0)
    const [jumpInput, setJumpInput] = useState<string>('')
    const [isJumping, setIsJumping] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [scrubPage, setScrubPage] = useState<number | null>(null)  // preview page while dragging

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
    const lastLoadedPath = useRef<string>('')
    const lastWheelTime = useRef(0)

    const pdfPath = activeShow?.pdfPath || ''

    // ----- Load PDF when path changes (Electron only) -----
    useEffect(() => {
        if (!isElectron || !pdfPath || pdfPath === lastLoadedPath.current) return

        lastLoadedPath.current = pdfPath
        setIsLoading(true)
        setLoadError(null)

        // Cancel ongoing render
        renderTaskRef.current?.cancel()
        pdfDocRef.current?.destroy()
        pdfDocRef.current = null

        let cancelled = false

        try {
            // Read the file directly from disk via Node.js fs — fast, no HTTP needed.
            // We use dynamic require (not import) because the renderer tsconfig
            // doesn't include Node.js type declarations.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fs = (window as any).require('fs') as { readFileSync: (p: string) => { buffer: ArrayBuffer; byteOffset: number; byteLength: number } }
            const nodeBuffer = fs.readFileSync(pdfPath)

            // Convert Node Buffer to a plain ArrayBuffer for pdfjs-dist
            const arrayBuffer: ArrayBuffer = nodeBuffer.buffer.slice(
                nodeBuffer.byteOffset,
                nodeBuffer.byteOffset + nodeBuffer.byteLength
            ) as ArrayBuffer


            pdfjsLib.getDocument({ data: arrayBuffer }).promise
                .then((doc) => {
                    if (cancelled) { doc.destroy(); return }
                    pdfDocRef.current = doc
                    setTotalPages(doc.numPages)
                    setIsLoading(false)
                    renderPage(doc, pageNumber)
                })
                .catch((err) => {
                    if (cancelled) return
                    console.error('[PdfViewer] Load error:', err)
                    setLoadError('Kon PDF niet laden: ' + (err?.message || String(err)))
                    setIsLoading(false)
                })
        } catch (err: any) {
            if (!cancelled) {
                console.error('[PdfViewer] fs.readFileSync failed:', err)
                setLoadError('Bestand niet gevonden: ' + pdfPath)
                setIsLoading(false)
            }
        }

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isElectron, pdfPath])

    // ----- Re-render when page number changes -----
    useEffect(() => {
        if (pdfDocRef.current) {
            renderPage(pdfDocRef.current, pageNumber)
        }
        setJumpInput('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNumber])

    // ----- Canvas rendering -----
    const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
        if (!canvasRef.current) return

        // Cancel previous render task
        if (renderTaskRef.current) {
            try { renderTaskRef.current.cancel() } catch { /* noop */ }
            renderTaskRef.current = null
        }

        try {
            const page = await doc.getPage(Math.max(1, Math.min(num, doc.numPages)))
            const canvas = canvasRef.current
            if (!canvas) return

            const containerWidth = canvas.parentElement?.clientWidth || 800
            const unscaled = page.getViewport({ scale: 1 })
            const scale = containerWidth / unscaled.width
            const viewport = page.getViewport({ scale })

            canvas.width = viewport.width
            canvas.height = viewport.height

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const task = page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport } as any)
            renderTaskRef.current = task
            await task.promise
        } catch (err: any) {
            if (err?.name === 'RenderingCancelledException') return
            console.error('[PdfViewer] Render error:', err)
        }
    }, [])

    // ----- Navigation (only manual navigation triggers SYNC_PAGE to remotes) -----
    const navigateTo = useCallback((page: number) => {
        setCurrentScriptPage(page)
        // Only the Electron host explicitly syncs manual navigation to remote clients
        if (!!(window as any).require) {
            networkService.sendCommand({ type: 'SYNC_PAGE', page })
        }
    }, [setCurrentScriptPage])

    const handleNextPage = useCallback(() => {
        if (totalPages > 0 && pageNumber >= totalPages) return
        navigateTo(pageNumber + 1)
    }, [pageNumber, navigateTo, totalPages])

    const handlePrevPage = useCallback(() => {
        if (pageNumber > 1) navigateTo(pageNumber - 1)
    }, [pageNumber, navigateTo])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const now = Date.now()
        if (now - lastWheelTime.current < 500) return  // 500ms cooldown
        if (Math.abs(e.deltaY) < 20) return
        lastWheelTime.current = now
        if (e.deltaY > 0) handleNextPage()
        else handlePrevPage()
    }, [handleNextPage, handlePrevPage])

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const num = parseInt(jumpInput, 10)
        if (!isNaN(num) && num >= 1 && (totalPages === 0 || num <= totalPages)) {
            navigateTo(num)
        }
        setIsJumping(false)
        setJumpInput('')
    }

    const handleBindToCue = () => {
        if (selectedEventIndex >= 0) {
            updateEvent(selectedEventIndex, { scriptPg: pageNumber })
            addToast(`Pagina ${pageNumber} gekoppeld aan geselecteerde cue`, 'info')
        } else {
            addToast('Selecteer eerst een cue in het grid', 'warning')
        }
    }

    // ----- Remote client: full pdfjs canvas viewer via HTTP -----
    if (!isElectron) {
        return <RemotePdfViewer pdfPath={pdfPath} currentScriptPage={pageNumber} />
    }

    // ----- No PDF loaded -----
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

    // ----- Error -----
    if (loadError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-red-400 p-8 text-center">
                <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 max-w-sm">
                    <h3 className="text-lg font-bold mb-2">PDF fout</h3>
                    <p className="text-xs leading-relaxed opacity-80">{loadError}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-black select-none">
            {/* Canvas area — min-h-0 is critical: without it, flex-1 uses min-height:auto
                and grows to canvas height, pushing toolbar off-screen */}
            <div
                className="flex-1 min-h-0 overflow-hidden bg-black relative"
                onWheel={handleWheel}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-white/40 text-xs font-mono animate-pulse">PDF laden...</div>
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    className={cn(
                        'w-full block transition-[filter] duration-200',
                        shouldInvert && 'pdf-inverted'
                    )}
                />
            </div>

            {/* Page scrubber—only show when PDF is loaded with known total pages */}
            {totalPages > 1 && (
                <div className="shrink-0 px-3 py-1.5 bg-black border-t border-white/5 flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 shrink-0">1</span>
                    <div className="relative flex-1 h-4 flex items-center">
                        <input
                            type="range"
                            min={1}
                            max={totalPages}
                            value={scrubPage ?? pageNumber}
                            onChange={(e) => {
                                setScrubPage(Number(e.target.value))
                            }}
                            onMouseUp={(e) => {
                                const p = Number((e.target as HTMLInputElement).value)
                                navigateTo(p)
                                setScrubPage(null)
                            }}
                            onTouchEnd={(e) => {
                                const p = Number((e.target as HTMLInputElement).value)
                                navigateTo(p)
                                setScrubPage(null)
                            }}
                            className="pdf-scrubber w-full"
                            title={`Pagina ${scrubPage ?? pageNumber} van ${totalPages}`}
                        />
                        {/* Tooltip showing preview page while dragging */}
                        {scrubPage !== null && (
                            <div
                                className="pdf-scrubber-tooltip"
                                // --offset drives the left position via CSS custom property
                                // CSS: left: var(--offset, 0%)
                                {...{ style: { '--offset': `calc(${((scrubPage - 1) / Math.max(totalPages - 1, 1)) * 100}% - 12px)` } } as any}
                            >
                                {scrubPage}
                            </div>
                        )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 shrink-0">{totalPages}</span>
                </div>
            )}

            {/* Toolbar */}
            <div className="h-12 bg-background border-t border-white/10 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-black/20 rounded-xl border border-white/10 p-0.5 shadow-inner">
                        <button
                            onClick={handlePrevPage}
                            disabled={pageNumber <= 1}
                            title="Vorige Pagina"
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 text-primary"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="px-2 min-w-[90px] text-center border-x border-white/5">
                            {isJumping ? (
                                <form onSubmit={handleJumpSubmit} className="flex items-center">
                                    <input
                                        autoFocus
                                        type="number"
                                        min={1}
                                        max={totalPages || undefined}
                                        value={jumpInput}
                                        onChange={(e) => setJumpInput(e.target.value)}
                                        onBlur={() => { setIsJumping(false); setJumpInput('') }}
                                        className="w-16 bg-transparent text-center text-xs font-mono font-bold text-white outline-none border-b border-primary"
                                        placeholder={String(pageNumber)}
                                    />
                                </form>
                            ) : (
                                <button
                                    onClick={() => { setIsJumping(true); setJumpInput(String(pageNumber)) }}
                                    title="Klik om naar pagina te springen"
                                    className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mr-1">Pg</span>
                                    <span className="text-xs font-mono font-bold">{pageNumber}</span>
                                    {totalPages > 0 && (
                                        <span className="text-[10px] font-bold text-white/20 ml-1">/ {totalPages}</span>
                                    )}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleNextPage}
                            disabled={totalPages > 0 && pageNumber >= totalPages}
                            title="Volgende Pagina"
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20 text-primary"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => { setIsJumping(true); setJumpInput('') }}
                        title="Spring naar pagina (of klik op paginanummer)"
                        className={cn('p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white hidden')} // hidden: klik op pg-teller doet hetzelfde
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShouldInvert(!shouldInvert)}
                        className={cn(
                            'flex items-center gap-2 h-9 px-4 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest bg-black/20 border-white/10 text-white/40 hover:bg-white/5',
                            shouldInvert && 'border-primary/20'
                        )}
                    >
                        {shouldInvert ? <Moon className="w-3.5 h-3.5 text-primary" /> : <Sun className="w-3.5 h-3.5 text-primary" />}
                        {shouldInvert ? 'Donker' : 'Licht'}
                    </button>

                    {!isLocked && (
                        <button
                            onClick={handleBindToCue}
                            disabled={selectedEventIndex === -1}
                            className="flex items-center gap-2 h-9 px-4 bg-black/20 hover:bg-white/5 border border-white/10 rounded-xl transition-all group disabled:opacity-20 disabled:grayscale text-white/40"
                        >
                            <LinkIcon className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Koppel aan cue</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PdfViewer
