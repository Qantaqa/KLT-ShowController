import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ShowEvent, PdfScriptNote } from '../types/show'
import { ChevronLeft, ChevronRight, Sun, Moon, ZoomIn, ZoomOut, MessageSquarePlus } from 'lucide-react'
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

const PDF_SCROLL_GAP_PX = 8
/** Horizontale padding op scroll-inhoud (px-8); canvas-breedte moet hiermee overeenkomen. */
const PDF_SCROLL_INLINE_PAD_PX = 32
const PDF_VIRTUAL_BUFFER = 2
const PDF_ZOOM_MIN = 0.75
const PDF_ZOOM_MAX = 2.5
const PDF_ZOOM_STEP = 0.1
const PAGE_TOP_DEBOUNCE_MS = 160

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n))
}

/** Stagehand (action) markers on the PDF: label + right-pointing triangle; right-click for menu. Edit mode: sleep verplaatsen. */
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
    const isLocked = useSequencerStore(s => s.isLocked)
    const [ctx, setCtx] = useState<null | { x: number; y: number; rowIndex: number }>(null)
    const [draggingRowIndex, setDraggingRowIndex] = useState<number | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)

    const items = useMemo(() => {
        const out: { key: number; event: ShowEvent; x: number; y: number; done: boolean; label: string }[] = []
        events.forEach((e, idx) => {
            if ((e.type || '').toLowerCase() !== 'action') return
            if (Number(e.scriptPg) !== Number(pageNumber)) return
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

    useEffect(() => {
        if (draggingRowIndex === null) return
        const onMove = (e: MouseEvent) => {
            const el = overlayRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) return
            const nx = clamp((e.clientX - r.left) / r.width, 0, 1)
            const ny = clamp((e.clientY - r.top) / r.height, 0, 1)
            updateEvent(draggingRowIndex, { scriptMarkerNorm: { x: nx, y: ny } })
        }
        const onUp = () => setDraggingRowIndex(null)
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [draggingRowIndex, updateEvent])

    if (items.length === 0 && !ctx) return null

    const triFill = (done: boolean) => (done ? '#eab308' : '#ef4444')

    return (
        <>
            <div ref={overlayRef} className="absolute inset-0 z-20 pointer-events-none overflow-visible">
                {items.map(({ key, x, y, done, label }) => (
                    <div
                        key={key}
                        className={cn(
                            'pdf-action-marker-wrap absolute z-20 flex flex-row items-center gap-0 pointer-events-auto',
                            isLocked ? 'cursor-context-menu' : 'cursor-grab active:cursor-grabbing'
                        )}
                        style={{
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => {
                            if (isLocked) return
                            if (e.button !== 0) return
                            e.preventDefault()
                            e.stopPropagation()
                            setCtx(null)
                            setDraggingRowIndex(key)
                        }}
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

/** Electron: vaste script-opmerkingen (ander kleuraccent + tekstballon). */
function PdfScriptNotesOverlay({ pageNumber }: { pageNumber: number }) {
    const activeShow = useSequencerStore(s => s.activeShow)
    const updateActiveShow = useSequencerStore(s => s.updateActiveShow)
    const isLocked = useSequencerStore(s => s.isLocked)

    const [menu, setMenu] = useState<null | { x: number; y: number; noteId: string }>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const notesOnPage = useMemo(() => {
        const list = activeShow?.viewState?.pdfScriptNotes ?? []
        return list.filter(n => Number(n.page) === Number(pageNumber))
    }, [activeShow?.viewState?.pdfScriptNotes, pageNumber])

    useEffect(() => {
        if (!menu) return
        const onMouseDown = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return
            setMenu(null)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenu(null)
        }
        const t = window.setTimeout(() => document.addEventListener('mousedown', onMouseDown), 0)
        window.addEventListener('keydown', onKey)
        return () => {
            window.clearTimeout(t)
            document.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [menu])

    if (notesOnPage.length === 0 && !menu) return null

    const persist = (next: PdfScriptNote[]) => {
        if (!activeShow) return
        void updateActiveShow({
            viewState: {
                ...activeShow.viewState,
                pdfScriptNotes: next
            }
        })
    }

    return (
        <>
            <div className="absolute inset-0 z-10 pointer-events-none overflow-visible">
                {notesOnPage.map(note => (
                    <div
                        key={note.id}
                        className="group/note absolute z-10 flex flex-col items-center pointer-events-auto cursor-context-menu"
                        style={{
                            left: `${note.x * 100}%`,
                            top: `${note.y * 100}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={e => e.stopPropagation()}
                        onContextMenu={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (isLocked) return
                            setMenu({ x: e.clientX, y: e.clientY, noteId: note.id })
                        }}
                    >
                        <div
                            className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                            title={note.text}
                        />
                        <div
                            className={cn(
                                'pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 max-h-[min(40vh,200px)] max-w-[min(240px,72vw)] -translate-x-1/2 overflow-y-auto rounded-lg border border-sky-400/35 bg-slate-900/95 px-2.5 py-1.5 text-left text-[10px] leading-snug text-sky-50 shadow-xl opacity-0 transition-opacity duration-150 group-hover/note:opacity-100'
                            )}
                        >
                            {note.text}
                        </div>
                    </div>
                ))}
            </div>
            {menu &&
                !isLocked &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[20050] min-w-[200px] rounded-lg border border-white/15 bg-[#1e1e24] py-1 shadow-xl"
                        style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 160) }}
                        onMouseDown={e => e.stopPropagation()}
                        onContextMenu={e => e.preventDefault()}
                    >
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10"
                            onClick={() => {
                                const cur = (activeShow?.viewState?.pdfScriptNotes ?? []).find(n => n.id === menu.noteId)
                                const t = window.prompt('Opmerking bewerken:', cur?.text ?? '')
                                if (t != null) {
                                    const trimmed = t.trim()
                                    const all = activeShow?.viewState?.pdfScriptNotes ?? []
                                    if (!trimmed) persist(all.filter(n => n.id !== menu.noteId))
                                    else persist(all.map(n => (n.id === menu.noteId ? { ...n, text: trimmed } : n)))
                                }
                                setMenu(null)
                            }}
                        >
                            Tekst bewerken…
                        </button>
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10 border-t border-white/10"
                            onClick={() => {
                                if (window.confirm('Deze script-opmerking verwijderen?')) {
                                    const all = activeShow?.viewState?.pdfScriptNotes ?? []
                                    persist(all.filter(n => n.id !== menu.noteId))
                                }
                                setMenu(null)
                            }}
                        >
                            Verwijderen…
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
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-black select-none">
            <div
                ref={pdfAreaRef}
                className="flex min-h-0 flex-1 overflow-hidden bg-black relative flex items-center justify-center overscroll-y-contain"
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
    const events = useSequencerStore((state) => state.events)
    const updateEvent = useSequencerStore((state) => state.updateEvent)
    const addToast = useSequencerStore((state) => state.addToast)
    const updateActiveShow = useSequencerStore((state) => state.updateActiveShow)

    const isElectron = !!(window as any).require

    const [shouldInvert, setShouldInvert] = useState<boolean>(true)
    const [scriptNotePlaceMode, setScriptNotePlaceMode] = useState(false)
    const [totalPages, setTotalPages] = useState<number>(activeShow?.totalPages || 0)
    const [jumpInput, setJumpInput] = useState<string>('')
    const [isJumping, setIsJumping] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [scrubPage, setScrubPage] = useState<number | null>(null)  // preview page while dragging

    const scrollRef = useRef<HTMLDivElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTasksByPageRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map())
    const canvasByPageRef = useRef<Map<number, HTMLCanvasElement>>(new Map())
    const pageBlockRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const firstPageSizeRef = useRef<{ w: number; h: number } | null>(null)
    const lastLoadedPath = useRef<string>('')
    const fromLocalScrollRef = useRef(false)
    const dominantDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const needsInitialScrollRef = useRef(false)
    const allowDominantPageSyncRef = useRef(false)
    const [pdfAreaSize, setPdfAreaSize] = useState({ w: 0, h: 0 })
    const [userZoom, setUserZoom] = useState(1)
    const [rowHeights, setRowHeights] = useState<Record<number, number>>({})
    const [visibleRange, setVisibleRange] = useState({ start: 1, end: 1 })

    const rowHeightsRef = useRef(rowHeights)
    rowHeightsRef.current = rowHeights

    const pdfPath = activeShow?.pdfPath || ''

    const getDefaultRowHeight = useCallback(() => {
        const sc = scrollRef.current
        const cw = Math.max((sc?.clientWidth ?? pdfAreaSize.w) - PDF_SCROLL_INLINE_PAD_PX * 2, 320)
        const ch = sc?.clientHeight ?? pdfAreaSize.h
        const meta = firstPageSizeRef.current
        if (!meta) return 420
        const base = computePdfScale(meta.w, meta.h, cw, webcamStripVisible ? ch : 0, webcamStripVisible)
        return meta.h * base * userZoom + PDF_SCROLL_GAP_PX
    }, [pdfAreaSize.w, pdfAreaSize.h, webcamStripVisible, userZoom])

    const getDominantPageAtScroll = useCallback(() => {
        const sc = scrollRef.current
        if (!sc || totalPages < 1) return 1
        const st = sc.scrollTop
        const vh = sc.clientHeight
        const centerY = st + vh / 2
        const defaultH = getDefaultRowHeight()
        let top = 0
        for (let p = 1; p <= totalPages; p++) {
            const h = rowHeightsRef.current[p] ?? defaultH
            if (top + h > centerY) return p
            top += h
        }
        return totalPages
    }, [getDefaultRowHeight, totalPages])

    const updateVisibleRangeFromScroll = useCallback(() => {
        const sc = scrollRef.current
        if (!sc || totalPages < 1) return
        const st = sc.scrollTop
        const vh = sc.clientHeight
        const defaultH = getDefaultRowHeight()
        const buf = PDF_VIRTUAL_BUFFER * defaultH
        let top = 0
        let start = 1
        for (let p = 1; p <= totalPages; p++) {
            const h = rowHeightsRef.current[p] ?? defaultH
            if (top + h > st - buf) {
                start = clamp(p - PDF_VIRTUAL_BUFFER, 1, totalPages)
                break
            }
            top += h
        }
        top = 0
        let end = totalPages
        for (let p = 1; p <= totalPages; p++) {
            const h = rowHeightsRef.current[p] ?? defaultH
            top += h
            if (top >= st + vh + buf) {
                end = clamp(p + PDF_VIRTUAL_BUFFER, 1, totalPages)
                break
            }
        }
        if (end < start) end = start
        setVisibleRange(prev => (prev.start !== start || prev.end !== end ? { start, end } : prev))
    }, [getDefaultRowHeight, totalPages])

    const flushDominantPage = useCallback(() => {
        if (!allowDominantPageSyncRef.current) return
        const dom = getDominantPageAtScroll()
        const cur = useSequencerStore.getState().activeShow?.viewState?.currentScriptPage || 1
        if (dom !== cur) {
            fromLocalScrollRef.current = true
            setCurrentScriptPage(dom)
        }
    }, [getDominantPageAtScroll, setCurrentScriptPage])

    useEffect(() => {
        if (!isElectron) return
        if (isLoading) {
            allowDominantPageSyncRef.current = false
            return
        }
        const t = window.setTimeout(() => {
            allowDominantPageSyncRef.current = true
        }, 450)
        return () => window.clearTimeout(t)
    }, [isElectron, isLoading, pdfPath])

    // ----- Load PDF when path changes (Electron only) -----
    useEffect(() => {
        if (!isElectron || !pdfPath || pdfPath === lastLoadedPath.current) return

        lastLoadedPath.current = pdfPath
        setIsLoading(true)
        setLoadError(null)
        setRowHeights({})
        firstPageSizeRef.current = null
        setUserZoom(1)

        renderTasksByPageRef.current.forEach(t => {
            try { t.cancel() } catch { /* noop */ }
        })
        renderTasksByPageRef.current.clear()
        canvasByPageRef.current.clear()
        pdfDocRef.current?.destroy()
        pdfDocRef.current = null

        let cancelled = false

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fs = (window as any).require('fs') as { readFileSync: (p: string) => { buffer: ArrayBuffer; byteOffset: number; byteLength: number } }
            const nodeBuffer = fs.readFileSync(pdfPath)
            const arrayBuffer: ArrayBuffer = nodeBuffer.buffer.slice(
                nodeBuffer.byteOffset,
                nodeBuffer.byteOffset + nodeBuffer.byteLength
            ) as ArrayBuffer

            pdfjsLib.getDocument({ data: arrayBuffer }).promise
                .then(async (doc) => {
                    if (cancelled) { doc.destroy(); return }
                    pdfDocRef.current = doc
                    setTotalPages(doc.numPages)
                    try {
                        const p1 = await doc.getPage(1)
                        const v = p1.getViewport({ scale: 1 })
                        firstPageSizeRef.current = { w: v.width, h: v.height }
                    } catch { /* noop */ }
                    setIsLoading(false)
                    needsInitialScrollRef.current = true
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
            renderTasksByPageRef.current.forEach(t => {
                try { t.cancel() } catch { /* noop */ }
            })
            renderTasksByPageRef.current.clear()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isElectron, pdfPath])

    useEffect(() => {
        const el = scrollRef.current
        if (!isElectron || !el) return
        const ro = new ResizeObserver(() => {
            setPdfAreaSize({ w: el.clientWidth, h: el.clientHeight })
            updateVisibleRangeFromScroll()
        })
        ro.observe(el)
        setPdfAreaSize({ w: el.clientWidth, h: el.clientHeight })
        return () => ro.disconnect()
    }, [isElectron, pdfPath, updateVisibleRangeFromScroll])

    useEffect(() => {
        if (!isElectron || totalPages < 1) return
        const id = requestAnimationFrame(() => updateVisibleRangeFromScroll())
        return () => cancelAnimationFrame(id)
    }, [isElectron, totalPages, updateVisibleRangeFromScroll])

    useEffect(() => {
        const el = scrollRef.current
        if (!isElectron || !el) return
        const onScroll = () => {
            updateVisibleRangeFromScroll()
            if (dominantDebounceRef.current) window.clearTimeout(dominantDebounceRef.current)
            dominantDebounceRef.current = window.setTimeout(() => {
                dominantDebounceRef.current = null
                flushDominantPage()
            }, PAGE_TOP_DEBOUNCE_MS)
        }
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            el.removeEventListener('scroll', onScroll)
            if (dominantDebounceRef.current) window.clearTimeout(dominantDebounceRef.current)
        }
    }, [isElectron, flushDominantPage, updateVisibleRangeFromScroll])

    useEffect(() => {
        const el = scrollRef.current
        if (!isElectron || !el) return
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return
            e.preventDefault()
            const delta = -e.deltaY * 0.0015
            setUserZoom(z => clamp(Number((z + delta).toFixed(3)), PDF_ZOOM_MIN, PDF_ZOOM_MAX))
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [isElectron, pdfPath])

    useEffect(() => {
        if (!isElectron || isLoading || totalPages < 1) return
        if (!needsInitialScrollRef.current) return
        needsInitialScrollRef.current = false
        requestAnimationFrame(() => {
            updateVisibleRangeFromScroll()
            const p0 = useSequencerStore.getState().activeShow?.viewState?.currentScriptPage || 1
            pageBlockRefs.current.get(p0)?.scrollIntoView({ block: 'start', behavior: 'auto' })
        })
    }, [isElectron, isLoading, totalPages, updateVisibleRangeFromScroll])

    useEffect(() => {
        if (!isElectron) return
        if (fromLocalScrollRef.current) {
            fromLocalScrollRef.current = false
            setJumpInput('')
            return
        }
        setJumpInput('')
        const pb = pageBlockRefs.current.get(pageNumber)
        if (!pb || !scrollRef.current) return
        pb.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [isElectron, pageNumber])

    const renderPageToCanvas = useCallback(
        async (pageNum: number, canvas: HTMLCanvasElement) => {
            const doc = pdfDocRef.current
            if (!doc) return
            const prev = renderTasksByPageRef.current.get(pageNum)
            if (prev) {
                try { prev.cancel() } catch { /* noop */ }
                renderTasksByPageRef.current.delete(pageNum)
            }
            try {
                const page = await doc.getPage(pageNum)
                const sc = scrollRef.current
                const cw = Math.max((sc?.clientWidth ?? pdfAreaSize.w) - PDF_SCROLL_INLINE_PAD_PX * 2, 320)
                const ch = sc?.clientHeight ?? pdfAreaSize.h
                const unscaled = page.getViewport({ scale: 1 })
                const base = computePdfScale(
                    unscaled.width,
                    unscaled.height,
                    cw,
                    webcamStripVisible ? ch : 0,
                    webcamStripVisible
                )
                const scale = base * userZoom
                const viewport = page.getViewport({ scale })
                canvas.width = viewport.width
                canvas.height = viewport.height
                const ctx = canvas.getContext('2d')
                if (!ctx) return
                const task = page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport } as any)
                renderTasksByPageRef.current.set(pageNum, task)
                await task.promise
                renderTasksByPageRef.current.delete(pageNum)
                const rowH = canvas.height + PDF_SCROLL_GAP_PX
                setRowHeights(prev => {
                    if (prev[pageNum] === rowH) return prev
                    return { ...prev, [pageNum]: rowH }
                })
            } catch (err: any) {
                if (err?.name === 'RenderingCancelledException') return
                console.error('[PdfViewer] Render error:', err)
            }
        },
        [pdfAreaSize.w, pdfAreaSize.h, userZoom, webcamStripVisible]
    )

    useEffect(() => {
        if (!isElectron) return
        setRowHeights({})
    }, [isElectron, userZoom])

    useLayoutEffect(() => {
        if (!isElectron || !pdfDocRef.current || totalPages < 1) return
        const inRange = new Set<number>()
        for (let p = visibleRange.start; p <= visibleRange.end; p++) inRange.add(p)
        renderTasksByPageRef.current.forEach((t, p) => {
            if (!inRange.has(p)) {
                try { t.cancel() } catch { /* noop */ }
                renderTasksByPageRef.current.delete(p)
            }
        })
        for (let p = visibleRange.start; p <= visibleRange.end; p++) {
            const c = canvasByPageRef.current.get(p)
            if (c) void renderPageToCanvas(p, c)
        }
    }, [isElectron, renderPageToCanvas, totalPages, visibleRange.start, visibleRange.end, userZoom, pdfAreaSize.w, pdfAreaSize.h, webcamStripVisible])

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

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const num = parseInt(jumpInput, 10)
        if (!isNaN(num) && num >= 1 && (totalPages === 0 || num <= totalPages)) {
            navigateTo(num)
        }
        setIsJumping(false)
        setJumpInput('')
    }

    const canPlaceActionMarker =
        !isLocked &&
        selectedEventIndex >= 0 &&
        (events[selectedEventIndex]?.type || '').toLowerCase() === 'action'

    const pageIndices = useMemo(
        () => (totalPages > 0 ? Array.from({ length: totalPages }, (_, i) => i + 1) : []),
        [totalPages]
    )

    const handleCanvasClickActionMarker = useCallback(
        (canvasPage: number, e: React.MouseEvent<HTMLCanvasElement>) => {
            if (isLocked) return
            if (selectedEventIndex < 0) return
            const ev = events[selectedEventIndex]
            if (!ev || (ev.type || '').toLowerCase() !== 'action') return
            const canvas = e.currentTarget
            const rect = canvas.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const nx = (e.clientX - rect.left) / rect.width
            const ny = (e.clientY - rect.top) / rect.height
            updateEvent(selectedEventIndex, {
                scriptPg: canvasPage,
                scriptMarkerNorm: {
                    x: Math.min(1, Math.max(0, nx)),
                    y: Math.min(1, Math.max(0, ny))
                }
            })
            addToast('Marker geplaatst op actie', 'info')
        },
        [addToast, events, isLocked, selectedEventIndex, updateEvent]
    )

    const handleHostCanvasClick = useCallback(
        (canvasPage: number, e: React.MouseEvent<HTMLCanvasElement>) => {
            if (scriptNotePlaceMode && !isLocked) {
                const canvas = e.currentTarget
                const rect = canvas.getBoundingClientRect()
                if (rect.width <= 0 || rect.height <= 0) return
                const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
                const text = window.prompt('Tekst voor script-opmerking:', '')
                if (!text?.trim()) return
                const show = useSequencerStore.getState().activeShow
                if (!show) return
                const note: PdfScriptNote = {
                    id: `pdfn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    page: canvasPage,
                    x: nx,
                    y: ny,
                    text: text.trim()
                }
                void updateActiveShow({
                    viewState: {
                        ...show.viewState,
                        pdfScriptNotes: [...(show.viewState?.pdfScriptNotes ?? []), note]
                    }
                })
                addToast('Script-opmerking geplaatst', 'info')
                setScriptNotePlaceMode(false)
                return
            }
            handleCanvasClickActionMarker(canvasPage, e)
        },
        [addToast, handleCanvasClickActionMarker, isLocked, scriptNotePlaceMode, updateActiveShow]
    )

    useEffect(() => {
        if (isLocked) setScriptNotePlaceMode(false)
    }, [isLocked])

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
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-black select-none">
            <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-black relative overscroll-y-contain"
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="text-white/40 text-xs font-mono animate-pulse">PDF laden...</div>
                    </div>
                )}

                <div className="flex flex-col items-center px-8 pb-4 pt-2">
                    {pageIndices.map(p => {
                        const inRange = p >= visibleRange.start && p <= visibleRange.end
                        const est = rowHeights[p] ?? getDefaultRowHeight()
                        const ph = Math.max(40, est - PDF_SCROLL_GAP_PX)
                        return (
                            <div
                                key={p}
                                ref={el => {
                                    if (el) pageBlockRefs.current.set(p, el)
                                    else pageBlockRefs.current.delete(p)
                                }}
                                data-page={p}
                                className="relative z-0 w-full flex justify-center overflow-visible shrink-0 py-0"
                                style={{ minHeight: est }}
                            >
                                {inRange ? (
                                    <div className="relative z-0 inline-block max-w-full overflow-visible">
                                        <canvas
                                            ref={el => {
                                                const m = canvasByPageRef.current
                                                if (el) m.set(p, el)
                                                else m.delete(p)
                                            }}
                                            data-pdf-page={p}
                                            onClick={e => handleHostCanvasClick(p, e)}
                                            className={cn(
                                                'relative z-0 block transition-[filter] duration-200 max-w-full',
                                                !webcamStripVisible && 'w-full',
                                                shouldInvert && 'pdf-inverted',
                                                canPlaceActionMarker && !scriptNotePlaceMode && 'cursor-crosshair',
                                                scriptNotePlaceMode && !isLocked && 'cursor-copy'
                                            )}
                                        />
                                        <PdfScriptNotesOverlay pageNumber={p} />
                                        <PdfActionMarkersOverlay events={events} pageNumber={p} />
                                    </div>
                                ) : (
                                    <div
                                        className="w-full max-w-full rounded bg-white/[0.04] animate-pulse"
                                        style={{ height: ph }}
                                        aria-hidden
                                    />
                                )}
                            </div>
                        )
                    })}
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

                <div className="flex items-center gap-0.5 shrink-0 bg-black/20 rounded-lg border border-white/10 p-px">
                    <button
                        type="button"
                        onClick={() => setUserZoom(z => clamp(Number((z - PDF_ZOOM_STEP).toFixed(3)), PDF_ZOOM_MIN, PDF_ZOOM_MAX))}
                        disabled={userZoom <= PDF_ZOOM_MIN}
                        title="Uitzoomen (Ctrl + scroll)"
                        className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-20 text-primary"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1 min-w-[2.5rem] text-center text-[10px] font-mono font-bold text-white/70 tabular-nums">
                        {Math.round(userZoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => setUserZoom(z => clamp(Number((z + PDF_ZOOM_STEP).toFixed(3)), PDF_ZOOM_MIN, PDF_ZOOM_MAX))}
                        disabled={userZoom >= PDF_ZOOM_MAX}
                        title="Inzoomen (Ctrl + scroll)"
                        className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-20 text-primary"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>

                {!isLocked && (
                    <button
                        type="button"
                        onClick={() => setScriptNotePlaceMode(v => !v)}
                        title={
                            scriptNotePlaceMode
                                ? 'Annuleer — of klik op de PDF om een opmerking te plaatsen'
                                : 'Script-opmerking: zet aan en klik op de PDF'
                        }
                        className={cn(
                            'shrink-0 flex items-center gap-1 h-7 px-2 rounded-md border transition-all text-[9px] font-black uppercase tracking-tight',
                            scriptNotePlaceMode
                                ? 'border-sky-400/55 bg-sky-500/15 text-sky-100'
                                : 'border-white/10 bg-black/20 text-white/45 hover:bg-white/5 hover:text-white/75'
                        )}
                    >
                        <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[4.5rem] sm:max-w-none">Notitie</span>
                    </button>
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

export default PdfViewer
