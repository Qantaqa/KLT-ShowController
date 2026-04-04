import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ShowEvent } from '../types/show'
import { ChevronLeft, ChevronRight, Link as LinkIcon, Sun, Moon } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import { cn } from '../lib/utils'
import * as pdfjsLib from 'pdfjs-dist'
import { networkService } from '../services/network-service'

// Worker is bundled locally in public/ — works offline, no CDN dependency
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

/** Scale PDF page to fit container: width-only, or full page (width + height) when webcam strip is visible. */
function computePdfScale(
    pageWidth: number,
    pageHeight: number,
    containerWidth: number,
    containerHeight: number,
    fitFullPage: boolean
): number {
    const sw = containerWidth / pageWidth
    if (!fitFullPage || containerHeight <= 0) return sw
    const sh = containerHeight / pageHeight
    return Math.min(sw, sh)
}

/** Stagehand (action) markers on the PDF: label + right-pointing triangle; right-click for menu. */
function PdfActionMarkersOverlay({
    events,
    pageNumber
}: {
    events: ShowEvent[]
    pageNumber: number
}) {
    const updateEvent = useSequencerStore(s => s.updateEvent)
    const requestRowEditFromPdfMarker = useSequencerStore(s => s.requestRowEditFromPdfMarker)
    const setSelectedEvent = useSequencerStore(s => s.setSelectedEvent)
    const [ctx, setCtx] = useState<null | { x: number; y: number; rowIndex: number }>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const items = useMemo(() => {
        const out: { key: number; event: ShowEvent; x: number; y: number; done: boolean; label: string }[] = []
        events.forEach((e, idx) => {
            if ((e.type || '').toLowerCase() !== 'action') return
            if ((e.scriptPg || 0) !== pageNumber) return
            const mn = e.scriptMarkerNorm
            if (!mn || typeof mn.x !== 'number' || typeof mn.y !== 'number') return
            if (!Number.isFinite(mn.x) || !Number.isFinite(mn.y)) return
            const label = `${(e.act || '').trim() || '?'} - ${e.sceneId ?? '?'}.${e.eventId ?? '?'}`
            out.push({ key: idx, event: e, x: mn.x, y: mn.y, done: !!e.actionCompleted, label })
        })
        return out
    }, [events, pageNumber])

    useEffect(() => {
        if (!ctx) return
        const onMouseDown = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return
            setCtx(null)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setCtx(null)
        }
        const t = window.setTimeout(() => document.addEventListener('mousedown', onMouseDown), 0)
        window.addEventListener('keydown', onKey)
        return () => {
            window.clearTimeout(t)
            document.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('keydown', onKey)
        }
    }, [ctx])

    if (items.length === 0 && !ctx) return null

    const triFill = (done: boolean) => (done ? '#eab308' : '#ef4444')

    return (
        <>
            <div className="absolute inset-0 pointer-events-none overflow-visible">
                {items.map(({ key, x, y, done, label }) => (
                    <div
                        key={key}
                        className="absolute flex flex-row items-center gap-0 pointer-events-auto cursor-context-menu"
                        style={{
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={e => e.stopPropagation()}
                        onContextMenu={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            setCtx({ x: e.clientX, y: e.clientY, rowIndex: key })
                        }}
                    >
                        <span
                            className="select-none text-[8px] font-bold tracking-tight text-white max-h-[52px] overflow-hidden text-ellipsis"
                            style={{
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                textShadow: '0 0 2px #000, 0 1px 3px #000'
                            }}
                            title={label}
                        >
                            {label}
                        </span>
                        <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden className="shrink-0">
                            <polygon
                                points="2,3 2,15 18,9"
                                fill={triFill(done)}
                                stroke="#000"
                                strokeWidth="1.1"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                ))}
            </div>
            {ctx &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[20050] min-w-[200px] rounded-lg border border-white/15 bg-[#1e1e24] py-1 shadow-xl"
                        style={{ left: Math.min(ctx.x, window.innerWidth - 220), top: Math.min(ctx.y, window.innerHeight - 120) }}
                        onMouseDown={e => e.stopPropagation()}
                        onContextMenu={e => e.preventDefault()}
                    >
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10"
                            onClick={() => {
                                setSelectedEvent(ctx.rowIndex)
                                requestRowEditFromPdfMarker(ctx.rowIndex)
                                setCtx(null)
                            }}
                        >
                            Actie bewerken…
                        </button>
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10 border-t border-white/10"
                            onClick={() => {
                                if (
                                    window.confirm(
                                        'PDF-marker van deze actie verwijderen? De actie zelf blijft behouden.'
                                    )
                                ) {
                                    updateEvent(ctx.rowIndex, { scriptMarkerNorm: undefined })
                                }
                                setCtx(null)
                            }}
                        >
                            Marker verwijderen…
                        </button>
                    </div>,
                    document.body
                )}
        </>
    )
}

// ---------------------------------------------------------------------------
// RemotePdfViewer — for browser clients (non-Electron)
// Loads PDF via HTTP from the host file server. Free navigation.
// Jumps to page when EVENT_PAGE arrives (event-triggered, not manual host nav).
// ---------------------------------------------------------------------------
const RemotePdfViewer: React.FC<{
    pdfPath: string
    currentScriptPage: number
    webcamStripVisible: boolean
}> = ({ pdfPath, currentScriptPage, webcamStripVisible }) => {
    const appSettings = useSequencerStore((s) => s.appSettings)
    const events = useSequencerStore((s) => s.events)

    const [localPage, setLocalPage] = useState(currentScriptPage || 1)
    const [totalPages, setTotalPages] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [shouldInvert, setShouldInvert] = useState(true)
    const [isJumping, setIsJumping] = useState(false)
    const [jumpInput, setJumpInput] = useState('')
    const [scrubPage, setScrubPage] = useState<number | null>(null)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pdfAreaRef = useRef<HTMLDivElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
    const lastWheelTime = useRef(0)
    const lastLoadedPath = useRef('')
    const [pdfAreaSize, setPdfAreaSize] = useState({ w: 0, h: 0 })

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

        return () => {
            cancelled = true
            // StrictMode remount: allow second run to load; otherwise lastLoadedPath matches and we return early with isLoading stuck true
            lastLoadedPath.current = ''
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfPath, appSettings?.serverPort])

    useEffect(() => {
        const el = pdfAreaRef.current
        if (!el) return
        const ro = new ResizeObserver(() => {
            setPdfAreaSize({ w: el.clientWidth, h: el.clientHeight })
        })
        ro.observe(el)
        setPdfAreaSize({ w: el.clientWidth, h: el.clientHeight })
        return () => ro.disconnect()
    }, [pdfPath, loadError])

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

    // Re-render when script panel size or webcam strip changes (whole-page fit)
    useEffect(() => {
        if (pdfDocRef.current) renderPage(pdfDocRef.current, localPage)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfAreaSize, webcamStripVisible])

    const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
        if (!canvasRef.current) return
        if (renderTaskRef.current) { try { renderTaskRef.current.cancel() } catch { /* noop */ } }

        try {
            const page = await doc.getPage(Math.max(1, Math.min(num, doc.numPages)))
            const canvas = canvasRef.current
            if (!canvas) return
            const pw = pdfAreaSize.w || canvas.parentElement?.clientWidth || 800
            const ph = pdfAreaSize.h || canvas.parentElement?.clientHeight || 0
            const unscaled = page.getViewport({ scale: 1 })
            const scale = computePdfScale(unscaled.width, unscaled.height, pw, ph, webcamStripVisible)
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
    }, [pdfAreaSize, webcamStripVisible])

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
            <div
                ref={pdfAreaRef}
                className="flex-1 min-h-0 overflow-hidden bg-black relative flex items-center justify-center"
                onWheel={handleWheel}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-white/40 text-xs font-mono animate-pulse">PDF laden...</div>
                    </div>
                )}
                <div className="relative inline-block max-w-full max-h-full">
                    <canvas
                        ref={canvasRef}
                        className={cn(
                            'block transition-[filter] duration-200 max-w-full max-h-full',
                            !webcamStripVisible && 'w-full',
                            shouldInvert && 'pdf-inverted'
                        )}
                    />
                    <PdfActionMarkersOverlay events={events} pageNumber={localPage} />
                </div>
            </div>

            {/* Bottom bar: paginanav | scrubber | licht/donker */}
            <div className="shrink-0 bg-background border-t border-white/10 px-2 py-1 flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-0.5 bg-black/20 rounded-lg border border-white/10 p-px shrink-0">
                    <button onClick={() => navigateTo(localPage - 1)} disabled={localPage <= 1}
                        title="Vorige pagina"
                        className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-20 text-primary">
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="px-1.5 min-w-[64px] text-center border-x border-white/5">
                        {isJumping ? (
                            <form onSubmit={handleJumpSubmit} className="flex items-center justify-center">
                                <input autoFocus type="number" min={1} value={jumpInput}
                                    onChange={(e) => setJumpInput(e.target.value)}
                                    onBlur={() => { setIsJumping(false); setJumpInput('') }}
                                    className="w-12 bg-transparent text-center text-[11px] font-mono font-bold text-white outline-none border-b border-primary leading-tight"
                                    placeholder={String(localPage)} />
                            </form>
                        ) : (
                            <button type="button" onClick={() => { setIsJumping(true); setJumpInput(String(localPage)) }}
                                title="Spring naar pagina"
                                className="flex items-center justify-center gap-0.5 text-white/90 hover:text-white transition-colors leading-tight">
                                <span className="text-[8px] font-black uppercase tracking-tighter text-white/35">Pg</span>
                                <span className="text-[11px] font-mono font-bold">{localPage}</span>
                                {totalPages > 0 && <span className="text-[9px] font-bold text-white/25">/{totalPages}</span>}
                            </button>
                        )}
                    </div>
                    <button onClick={() => navigateTo(localPage + 1)} disabled={totalPages > 0 && localPage >= totalPages}
                        title="Volgende pagina"
                        className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-20 text-primary">
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {totalPages > 1 && (
                    <div className="relative flex-1 min-w-[40px] flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-white/25 shrink-0 tabular-nums">1</span>
                        <div className="relative flex-1 min-w-0 h-3 flex items-center">
                            <input
                                type="range"
                                min={1}
                                max={totalPages}
                                value={scrubPage ?? localPage}
                                onChange={(e) => setScrubPage(Number(e.target.value))}
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
                                title={`Pagina ${scrubPage ?? localPage} van ${totalPages}`}
                            />
                            {scrubPage !== null && (
                                <div
                                    className="pdf-scrubber-tooltip"
                                    {...{ style: { '--offset': `calc(${((scrubPage - 1) / Math.max(totalPages - 1, 1)) * 100}% - 10px)` } } as any}
                                >
                                    {scrubPage}
                                </div>
                            )}
                        </div>
                        <span className="text-[8px] font-black text-white/25 shrink-0 tabular-nums">{totalPages}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setShouldInvert(!shouldInvert)}
                    title={shouldInvert ? 'Donker script (invert)' : 'Licht script'}
                    className={cn(
                        'shrink-0 p-1 rounded-md border border-white/10 bg-black/20 text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors',
                        shouldInvert && 'border-primary/25 text-primary'
                    )}
                >
                    {shouldInvert ? <Moon className="w-3.5 h-3.5" strokeWidth={2} /> : <Sun className="w-3.5 h-3.5" strokeWidth={2} />}
                </button>
            </div>
        </div>
    )
}

export type PdfViewerProps = {
    /** Zijn webcam-previewstrook én uitklap-inhoud zichtbaar (dan past PDF volledige pagina in het paneel) */
    webcamStripVisible?: boolean
}

const PdfViewer: React.FC<PdfViewerProps> = ({ webcamStripVisible = false }) => {
    const activeShow = useSequencerStore((state) => state.activeShow)
    const pageNumber = useSequencerStore((state) => state.activeShow?.viewState?.currentScriptPage || 1)
    const setCurrentScriptPage = useSequencerStore((state) => state.setCurrentScriptPage)
    const isLocked = useSequencerStore((state) => state.isLocked)
    const selectedEventIndex = useSequencerStore((state) => state.selectedEventIndex)
    const activeEventIndex = useSequencerStore((state) => state.activeEventIndex)
    const events = useSequencerStore((state) => state.events)
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
    const pdfAreaRef = useRef<HTMLDivElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
    const lastLoadedPath = useRef<string>('')
    const lastWheelTime = useRef(0)
    const [pdfAreaSize, setPdfAreaSize] = useState({ w: 0, h: 0 })

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

        return () => {
            cancelled = true
            lastLoadedPath.current = ''
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isElectron, pdfPath])

    useEffect(() => {
        const el = pdfAreaRef.current
        if (!isElectron || !el) return
        const ro = new ResizeObserver(() => {
            setPdfAreaSize({ w: el.clientWidth, h: el.clientHeight })
        })
        ro.observe(el)
        setPdfAreaSize({ w: el.clientWidth, h: el.clientHeight })
        return () => ro.disconnect()
    }, [isElectron, pdfPath])

    // ----- Re-render when page number changes -----
    useEffect(() => {
        if (pdfDocRef.current) {
            renderPage(pdfDocRef.current, pageNumber)
        }
        setJumpInput('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNumber])

    // ----- Re-render when script panel resizes or webcam strip toggles -----
    useEffect(() => {
        if (pdfDocRef.current) renderPage(pdfDocRef.current, pageNumber)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfAreaSize, webcamStripVisible])

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

            const pw = pdfAreaSize.w || canvas.parentElement?.clientWidth || 800
            const ph = pdfAreaSize.h || canvas.parentElement?.clientHeight || 0
            const unscaled = page.getViewport({ scale: 1 })
            const scale = computePdfScale(unscaled.width, unscaled.height, pw, ph, webcamStripVisible)
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
    }, [pdfAreaSize, webcamStripVisible])

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

    const handleBindToActiveEvent = () => {
        if (activeEventIndex < 0) {
            addToast('Geen actief event om te koppelen', 'warning')
            return
        }

        const active = events[activeEventIndex]
        if (!active) {
            addToast('Geen actief event om te koppelen', 'warning')
            return
        }

        // Prefer binding to the Title row of the active event group (so it shows in the event header),
        // fallback to the active row if no title row exists.
        const titleIdx = events.findIndex(e =>
            e.act === active.act &&
            e.sceneId === active.sceneId &&
            e.eventId === active.eventId &&
            e.type?.toLowerCase() === 'title'
        )

        const idxToUpdate = titleIdx !== -1 ? titleIdx : activeEventIndex
        updateEvent(idxToUpdate, { scriptPg: pageNumber })
        addToast(`Pagina ${pageNumber} gekoppeld aan actief event`, 'info')
    }

    const canPlaceActionMarker =
        !isLocked &&
        selectedEventIndex >= 0 &&
        (events[selectedEventIndex]?.type || '').toLowerCase() === 'action'

    const handleCanvasClickActionMarker = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (isLocked) return
            if (selectedEventIndex < 0) return
            const ev = events[selectedEventIndex]
            if (!ev || (ev.type || '').toLowerCase() !== 'action') return
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const nx = (e.clientX - rect.left) / rect.width
            const ny = (e.clientY - rect.top) / rect.height
            updateEvent(selectedEventIndex, {
                scriptPg: pageNumber,
                scriptMarkerNorm: {
                    x: Math.min(1, Math.max(0, nx)),
                    y: Math.min(1, Math.max(0, ny))
                }
            })
            addToast('Marker geplaatst op actie', 'info')
        },
        [addToast, events, isLocked, pageNumber, selectedEventIndex, updateEvent]
    )

    // ----- Remote client: full pdfjs canvas viewer via HTTP -----
    if (!isElectron) {
        return (
            <RemotePdfViewer
                pdfPath={pdfPath}
                currentScriptPage={pageNumber}
                webcamStripVisible={webcamStripVisible}
            />
        )
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
                ref={pdfAreaRef}
                className="flex-1 min-h-0 overflow-hidden bg-black relative flex items-center justify-center"
                onWheel={handleWheel}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-white/40 text-xs font-mono animate-pulse">PDF laden...</div>
                    </div>
                )}

                <div className="relative inline-block max-w-full max-h-full">
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClickActionMarker}
                        className={cn(
                            'block transition-[filter] duration-200 max-w-full max-h-full',
                            !webcamStripVisible && 'w-full',
                            shouldInvert && 'pdf-inverted',
                            canPlaceActionMarker && 'cursor-crosshair'
                        )}
                    />
                    <PdfActionMarkersOverlay events={events} pageNumber={pageNumber} />
                </div>
            </div>

            {/* Onderbalk: paginanav | scrubber | invert | koppelknoppen */}
            <div className="shrink-0 bg-background border-t border-white/10 px-2 py-1 flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-0.5 bg-black/20 rounded-lg border border-white/10 p-px shrink-0">
                    <button
                        onClick={handlePrevPage}
                        disabled={pageNumber <= 1}
                        title="Vorige pagina"
                        className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-20 text-primary"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="px-1.5 min-w-[64px] text-center border-x border-white/5">
                        {isJumping ? (
                            <form onSubmit={handleJumpSubmit} className="flex items-center justify-center">
                                <input
                                    autoFocus
                                    type="number"
                                    min={1}
                                    max={totalPages || undefined}
                                    value={jumpInput}
                                    onChange={(e) => setJumpInput(e.target.value)}
                                    onBlur={() => { setIsJumping(false); setJumpInput('') }}
                                    className="w-12 bg-transparent text-center text-[11px] font-mono font-bold text-white outline-none border-b border-primary leading-tight"
                                    placeholder={String(pageNumber)}
                                />
                            </form>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setIsJumping(true); setJumpInput(String(pageNumber)) }}
                                title="Spring naar pagina"
                                className="flex items-center justify-center gap-0.5 text-white/90 hover:text-white transition-colors leading-tight"
                            >
                                <span className="text-[8px] font-black uppercase tracking-tighter text-white/35">Pg</span>
                                <span className="text-[11px] font-mono font-bold">{pageNumber}</span>
                                {totalPages > 0 && (
                                    <span className="text-[9px] font-bold text-white/25">/{totalPages}</span>
                                )}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleNextPage}
                        disabled={totalPages > 0 && pageNumber >= totalPages}
                        title="Volgende pagina"
                        className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-20 text-primary"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {totalPages > 1 && (
                    <div className="relative flex-1 min-w-[40px] flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-white/25 shrink-0 tabular-nums">1</span>
                        <div className="relative flex-1 min-w-0 h-3 flex items-center">
                            <input
                                type="range"
                                min={1}
                                max={totalPages}
                                value={scrubPage ?? pageNumber}
                                onChange={(e) => setScrubPage(Number(e.target.value))}
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
                            {scrubPage !== null && (
                                <div
                                    className="pdf-scrubber-tooltip"
                                    {...{ style: { '--offset': `calc(${((scrubPage - 1) / Math.max(totalPages - 1, 1)) * 100}% - 10px)` } } as any}
                                >
                                    {scrubPage}
                                </div>
                            )}
                        </div>
                        <span className="text-[8px] font-black text-white/25 shrink-0 tabular-nums">{totalPages}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setShouldInvert(!shouldInvert)}
                    title={shouldInvert ? 'Donker script (invert)' : 'Licht script'}
                    className={cn(
                        'shrink-0 p-1 rounded-md border border-white/10 bg-black/20 text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors',
                        shouldInvert && 'border-primary/25 text-primary'
                    )}
                >
                    {shouldInvert ? <Moon className="w-3.5 h-3.5" strokeWidth={2} /> : <Sun className="w-3.5 h-3.5" strokeWidth={2} />}
                </button>

                {!isLocked && (
                    <>
                        <button
                            type="button"
                            onClick={handleBindToCue}
                            disabled={selectedEventIndex === -1}
                            title="Koppel aan geselecteerde cue"
                            className="flex items-center gap-1 h-7 px-2 bg-black/20 hover:bg-white/5 border border-white/10 rounded-md transition-all group disabled:opacity-20 disabled:grayscale text-white/40 shrink-0"
                        >
                            <LinkIcon className="w-3 h-3 text-primary group-hover:scale-110 transition-transform shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-tight leading-none">Cue</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleBindToActiveEvent}
                            disabled={activeEventIndex === -1}
                            title="Koppel aan actief event"
                            className="flex items-center gap-1 h-7 px-2 bg-black/20 hover:bg-white/5 border border-white/10 rounded-md transition-all group disabled:opacity-20 disabled:grayscale text-white/40 shrink-0"
                        >
                            <LinkIcon className="w-3 h-3 text-primary group-hover:scale-110 transition-transform shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-tight leading-none">Actief</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default PdfViewer
