import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    MoreVertical,
    Trash2,
    Edit2,
    Send,
    ArrowUp, ArrowDown,
    Info,
    Type,
    User,
    Zap,
    Check,
    Plus,
    Loader2,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Layers,
    Play,
    Square,
    Volume2,
    VolumeX,
    Repeat,
    FolderOpen,
    Monitor,
    Pipette,
    Copy,
    ClipboardPaste,
    Lightbulb,
    Clock,
    MousePointer2,
    SkipForward
} from 'lucide-react'
import { useShowStore, type Device } from '../store/useShowStore'
import type { ShowEvent, ClipboardItem } from '../services/xml-service'
import { cn } from '../lib/utils'

interface RenamableInputProps {
    value: string
    onRename: (newValue: string) => void
    className?: string
    placeholder?: string
    autoFocus?: boolean
    disabled?: boolean
    onBlur?: () => void
}

const RenamableInput: React.FC<RenamableInputProps> = ({ value, onRename, className, placeholder, autoFocus, disabled, onBlur }) => {
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const handleBlur = () => {
        if (localValue !== value) {
            onRename(localValue)
        }
        if (onBlur) onBlur()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur()
        }
    }

    return (
        <input
            className={className}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
        />
    )
}

const RenamableTextArea: React.FC<RenamableInputProps & { rows?: number }> = ({ value, onRename, className, placeholder, autoFocus, disabled, onBlur, rows = 3 }) => {
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const handleBlur = () => {
        if (localValue !== value) {
            onRename(localValue)
        }
        if (onBlur) onBlur()
    }

    return (
        <textarea
            className={cn(className, "resize-none")}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            rows={rows}
        />
    )
}

const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60)
    const s = Math.floor(Math.abs(seconds) % 60)
    return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`
}


const LightConfigurator: React.FC<{
    event: ShowEvent
    updateEvent: (partial: Partial<ShowEvent>) => void
    devices: any[]
}> = ({ event, updateEvent, devices }) => {
    const selectedDevice = devices.find(d => d.name === event.fixture)
    const [wledEffects, setWledEffects] = useState<string[]>([])
    const [wledPalettes, setWledPalettes] = useState<string[]>([])
    const [wledSegments, setWledSegments] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (selectedDevice?.type === 'wled' && (window as any).require) {
            setLoading(true)
            const { ipcRenderer } = (window as any).require('electron')
            Promise.all([
                ipcRenderer.invoke('wled:get-effects', selectedDevice.ip),
                ipcRenderer.invoke('wled:get-palettes', selectedDevice.ip),
                ipcRenderer.invoke('wled:get-info', selectedDevice.ip)
            ]).then(([effects, palettes, info]) => {
                setWledEffects(Array.isArray(effects) ? effects : [])
                setWledPalettes(Array.isArray(palettes) ? palettes : [])
                if (info?.state?.seg) setWledSegments(info.state.seg)
                setLoading(false)
            }).catch(err => {
                console.error("Failed to load WLED data", err)
                setLoading(false)
            })
        }
    }, [selectedDevice?.id])

    const fetchDeviceState = async () => {
        if (!selectedDevice || !(window as any).require) return
        setLoading(true)
        const { ipcRenderer } = (window as any).require('electron')

        try {
            if (selectedDevice.type === 'wled') {
                const data = await ipcRenderer.invoke('wled:get-info', selectedDevice.ip)
                if (data && data.state) {
                    const state = data.state
                    const segmentId = (event as any).segmentId || 0
                    const seg = state.seg.find((s: any) => s.id === (segmentId === -1 ? 0 : segmentId)) || state.seg[0]

                    if (seg) {
                        const rgbToHex = (rgb: number[]) => {
                            if (!rgb) return '#ffffff'
                            return '#' + rgb.map(x => (x || 0).toString(16).padStart(2, '0')).join('')
                        }

                        updateEvent({
                            brightness: state.bri,
                            color1: rgbToHex(seg.col[0]),
                            color2: rgbToHex(seg.col[1]),
                            color3: rgbToHex(seg.col[2]),
                            effect: wledEffects[seg.fx] || event.effect,
                            effectId: seg.fx,
                            palette: wledPalettes[seg.pal] || event.palette,
                            paletteId: seg.pal,
                            speed: seg.sx,
                            intensity: seg.ix
                        } as any)
                    }
                }
            } else if (selectedDevice.type === 'wiz') {
                const result = await ipcRenderer.invoke('wiz:get-pilot', selectedDevice.ip)
                if (result && result.result) {
                    const pilot = result.result
                    const rgbToHex = (r: number, g: number, b: number) => {
                        return '#' + [r, g, b].map(x => (x || 0).toString(16).padStart(2, '0')).join('')
                    }

                    updateEvent({
                        brightness: Math.round((pilot.dimming || 100) * 2.55),
                        color1: rgbToHex(pilot.r, pilot.g, pilot.b)
                    })
                }
            }
        } catch (err) {
            console.error("Failed to fetch device state", err)
        } finally {
            setLoading(false)
        }
    }

    const appSettings = useShowStore(s => s.appSettings)
    const serverIp = appSettings.serverIp || window.location.hostname;
    const FILE_PORT = (appSettings.serverPort || 3001) + 1;

    const getEffectPreviewUrl = (id: number | undefined) => {
        if (id === undefined || id < 0) return null;
        return `http://${serverIp}:${FILE_PORT}/wled/effects/${id}.gif`;
    }

    const getPalettePreviewUrl = (id: number | undefined) => {
        if (id === undefined || id < 0) return null;
        return `http://${serverIp}:${FILE_PORT}/wled/palettes/${id}.gif`;
    }

    return (
        <div className="flex flex-col gap-2 p-2 bg-black/40 rounded border border-white/10 mt-2 relative">
            {loading && <div className="absolute top-2 right-2"><Loader2 className="w-3 h-3 animate-spin text-white/50" /></div>}
            <div className="flex gap-2 items-center">
                {(event as any).usedFixtures ? (
                    (() => {
                        const filtered = devices.filter(d => (d.type === 'wled' || d.type === 'wiz') && (!(event as any).usedFixtures.includes(d.name) || d.name === event.fixture))
                        return filtered.length === 0 ? (
                            <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 text-[10px] text-red-400 italic flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" /> Geen verlichting beschikbaar
                            </div>
                        ) : (
                            <select
                                title="Doel Lamp"
                                className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                                value={event.fixture || ''}
                                onChange={(e) => updateEvent({ fixture: e.target.value })}
                            >
                                <option className="bg-zinc-900" value="">Selecteer Lamp...</option>
                                {filtered.map(d => (
                                    <option className="bg-zinc-900" key={d.id} value={d.name}>{d.name} ({d.type})</option>
                                ))}
                            </select>
                        )
                    })()
                ) : (
                    <select
                        title="Selecteer Lamp"
                        className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                        value={event.fixture || ''}
                        onChange={(e) => updateEvent({ fixture: e.target.value })}
                    >
                        <option className="bg-zinc-900" value="">Selecteer Lamp...</option>
                        {devices.filter(d => d.type === 'wled' || d.type === 'wiz').map(d => (
                            <option className="bg-zinc-900" key={d.id} value={d.name}>{d.name} ({d.type})</option>
                        ))}
                    </select>
                )}

                {selectedDevice && (
                    <button
                        onClick={fetchDeviceState}
                        className="px-2 py-1.5 bg-primary/20 hover:bg-primary/40 border border-primary/30 rounded text-primary transition-colors flex items-center gap-1.5"
                        title="Huidige status van device ophalen"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pipette className="w-3 h-3" />}
                        <span className="text-[9px] font-bold uppercase">Ophalen</span>
                    </button>
                )}

                {selectedDevice?.type === 'wiz' && (
                    <div className="flex gap-2 items-center flex-1">
                        <input
                            type="color"
                            className="bg-transparent w-6 h-6 border-none cursor-pointer"
                            value={event.color1 || '#ffffff'}
                            onChange={(e) => updateEvent({ color1: e.target.value })}
                            title="Kleur"
                        />
                        <div className="flex flex-col flex-1">
                            <label className="text-[8px] opacity-50 uppercase">Helderheid</label>
                            <input
                                title="Helderheid instellen"
                                type="range"
                                min="0" max="255"
                                value={event.brightness || 0}
                                onChange={(e) => updateEvent({ brightness: parseInt(e.target.value) })}
                                className="h-1 bg-white/10 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                            />
                        </div>
                    </div>
                )}
            </div>

            {selectedDevice?.type === 'wled' && (
                <div className="grid grid-cols-12 gap-2 text-[10px]">
                    <div className="col-span-12 flex gap-2">
                        <select
                            title="WLED Segment Selectie"
                            className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 outline-none"
                            value={(event as any).segmentId || -1} // -1 for all
                            onChange={(e) => updateEvent({ segmentId: parseInt(e.target.value) } as any)}
                        >
                            <option value={-1}>Alle Segmenten</option>
                            {wledSegments.map((seg: any) => (
                                <option key={seg.id} value={seg.id}>{seg.n ? seg.n : `Segment ${seg.id}`}</option>
                            ))}
                        </select>
                        <input
                            type="color"
                            className="bg-transparent w-6 h-6 border-none cursor-pointer"
                            value={event.color1 || '#ffffff'}
                            onChange={(e) => updateEvent({ color1: e.target.value })}
                            title="Primaire Kleur"
                        />
                        <input
                            type="color"
                            className="bg-transparent w-6 h-6 border-none cursor-pointer"
                            value={event.color2 || '#000000'}
                            onChange={(e) => updateEvent({ color2: e.target.value })}
                            title="Secundaire Kleur"
                        />
                    </div>

                    <div className="col-span-12 grid grid-cols-2 gap-2">
                        <div className="flex gap-2 min-w-0">
                            <div className="flex-1 space-y-1 min-w-0">
                                <label className="opacity-50 block font-bold uppercase tracking-tighter text-[8px]">Effect</label>
                                <select
                                    title="Effect Selectie"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-1 py-1 outline-none truncate"
                                    value={event.effect || ''}
                                    onChange={(e) => {
                                        const idx = e.target.selectedIndex;
                                        // effects array matches WLED ID order
                                        updateEvent({ effect: e.target.value, effectId: idx - 1 } as any)
                                    }}
                                >
                                    <option value="">Geen Effect</option>
                                    {wledEffects.map((eff, idx) => (
                                        <option key={idx} value={eff}>{eff}</option>
                                    ))}
                                </select>
                            </div>
                            {(event as any).effectId !== undefined && (event as any).effectId >= 0 && (
                                <div className="w-12 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group/prev-eff mt-4 self-end">
                                    <img
                                        src={getEffectPreviewUrl((event as any).effectId)!}
                                        alt="Effect"
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.target as HTMLImageElement).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/prev-eff:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <Info className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="fixed hidden group-hover/prev-eff:block z-[250] pointer-events-none p-1 bg-[#111] border border-white/20 rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{ transform: 'translate(40px, -60px)' }}>
                                        <img
                                            src={getEffectPreviewUrl((event as any).effectId)!}
                                            alt="Preview"
                                            className="w-48 aspect-video object-cover rounded"
                                            onError={(e) => (e.target as HTMLImageElement).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                                        />
                                        <div className="mt-1 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-center text-primary">{event.effect}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 min-w-0">
                            <div className="flex-1 space-y-1 min-w-0">
                                <label className="opacity-50 block font-bold uppercase tracking-tighter text-[8px]">Palette</label>
                                <select
                                    title="Palette Selectie"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-1 py-1 outline-none truncate"
                                    value={event.palette || ''}
                                    onChange={(e) => {
                                        const idx = e.target.selectedIndex;
                                        updateEvent({ palette: e.target.value, paletteId: idx - 1 } as any)
                                    }}
                                >
                                    <option value="">Geen Palette</option>
                                    {wledPalettes.map((pal, idx) => (
                                        <option key={idx} value={pal}>{pal}</option>
                                    ))}
                                </select>
                            </div>
                            {(event as any).paletteId !== undefined && (event as any).paletteId >= 0 && (
                                <div className="w-12 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group/prev-pal mt-4 self-end">
                                    <img
                                        src={getPalettePreviewUrl((event as any).paletteId)!}
                                        alt="Palette"
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.target as HTMLImageElement).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                                    />
                                    <div className="fixed hidden group-hover/prev-pal:block z-[250] pointer-events-none p-1 bg-[#111] border border-white/20 rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{ transform: 'translate(40px, -60px)' }}>
                                        <img
                                            src={getPalettePreviewUrl((event as any).paletteId)!}
                                            alt="Preview"
                                            className="w-48 aspect-video object-cover rounded"
                                            onError={(e) => (e.target as HTMLImageElement).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                                        />
                                        <div className="mt-1 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-center text-primary">{event.palette}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-span-6 space-y-1">
                        <label className="opacity-50 flex justify-between"><span>Speed</span> <span>{event.speed}</span></label>
                        <input
                            title="Effect Snelheid"
                            type="range"
                            min="0" max="255"
                            value={event.speed !== undefined ? event.speed : 128}
                            onChange={(e) => updateEvent({ speed: parseInt(e.target.value) })}
                            className="w-full h-1 bg-white/10 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                        />
                    </div>
                    <div className="col-span-6 space-y-1">
                        <label className="opacity-50 flex justify-between"><span>Intensity</span> <span>{event.intensity}</span></label>
                        <input
                            title="Effect Intensiteit"
                            type="range"
                            min="0" max="255"
                            value={event.intensity !== undefined ? event.intensity : 128}
                            onChange={(e) => updateEvent({ intensity: parseInt(e.target.value) })}
                            className="w-full h-1 bg-white/10 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}


const VideoWallPreviewOverlay: React.FC<{ layout: string, bezelSize?: number }> = ({ layout, bezelSize = 0 }) => {
    const [cols, rows] = useMemo(() => {
        const parts = (layout || '1x1').split('x');
        return [parseInt(parts[0]) || 1, parseInt(parts[1]) || 1];
    }, [layout]);

    return (
        <div className="absolute inset-0 grid pointer-events-none p-0.5" style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: `${bezelSize / 2}px` // Scale down slightly for the small preview box
        }}>
            {Array.from({ length: cols * rows }).map((_, i) => (
                <div key={i} className="border border-white/40 ring-1 ring-black/50" />
            ))}
        </div>
    );
};


const RowItem: React.FC<{
    event: ShowEvent
    originalIndex: number
    isActiveGroup?: boolean
    isNextGroup?: boolean
    handleRowClick: (index: number) => void
    handleRowDoubleClick: (index: number) => void
    editingIndex: number | null
    setEditingIndex: (index: number | null) => void
    menuOpenIndex: number | string | null
    setMenuOpenIndex: (index: number | string | null) => void
    activeShow: any
    isLocked: boolean
    activeEventIndex: number
    eventStatuses: any
    selectedEventIndex: number
    selectedEvent: ShowEvent | null
    ongoingEffects?: { type: 'media' | 'light', id: string }[]
}> = ({
    event, originalIndex, isActiveGroup, isNextGroup, handleRowClick, handleRowDoubleClick,
    editingIndex, setEditingIndex, menuOpenIndex, setMenuOpenIndex, isLocked,
    activeEventIndex, eventStatuses, selectedEventIndex, selectedEvent, ongoingEffects
}) => {
        const [currentTime, setCurrentTime] = useState(new Date())

        useEffect(() => {
            const t = setInterval(() => setCurrentTime(new Date()), 1000)
            return () => clearInterval(t)
        }, [])

        const isTimeTracking = useShowStore(s => s.isTimeTracking)
        const lastTransitionTime = useShowStore(s => s.lastTransitionTime)
        const events = useShowStore(s => s.events)

        // Actions
        const updateEvent = useShowStore(s => s.updateEvent)
        const deleteGroup = useShowStore(s => s.deleteGroup)
        const deleteEvent = useShowStore(s => s.deleteEvent)
        const resendEvent = useShowStore(s => s.resendEvent)
        const renameAct = useShowStore(s => s.renameAct)
        const renameScene = useShowStore(s => s.renameScene)
        const moveAct = useShowStore(s => s.moveAct)
        const moveScene = useShowStore(s => s.moveScene)
        const moveEvent = useShowStore(s => s.moveEvent)
        const insertAct = useShowStore(s => s.insertAct)
        const insertScene = useShowStore(s => s.insertScene)
        const insertEvent = useShowStore(s => s.insertEvent)
        const addEventAbove = useShowStore(s => s.addEventAbove)
        const addEventBelow = useShowStore(s => s.addEventBelow)
        const restartMedia = useShowStore(s => s.restartMedia)
        const stopMedia = useShowStore(s => s.stopMedia)
        const toggleAudio = useShowStore(s => s.toggleAudio)
        const toggleRepeat = useShowStore(s => s.toggleRepeat)
        const setMediaVolume = useShowStore(s => s.setMediaVolume)
        const copyToClipboard = useShowStore(s => s.copyToClipboard)
        const loadClipboard = useShowStore(s => s.loadClipboard)
        const clipboard = useShowStore(s => s.clipboard)
        const openModal = useShowStore(s => s.openModal)
        const pasteEvent = useShowStore(s => s.pasteEvent)
        const addCommentToEvent = useShowStore(s => s.addCommentToEvent)

        const pasteFromClipboard = (item: ClipboardItem, target: ShowEvent) => {
            if (isLocked) return

            const copiedEvent = { ...item.data }

            // Find group events to check for fixture conflict
            const events = useShowStore.getState().events
            const groupEvents = events.filter(e =>
                e.act === target.act &&
                e.sceneId === target.sceneId &&
                e.eventId === target.eventId
            )

            const existingEvent = groupEvents.find(e => e.fixture && e.fixture === copiedEvent.fixture)

            if (existingEvent) {
                const existingActualIndex = events.indexOf(existingEvent)
                openModal({
                    title: 'Apparaat in Gebruik',
                    message: `Het apparaat "${copiedEvent.fixture}" is al in gebruik in deze groep. Wil je de bestaande regel bijwerken of een nieuwe regel toevoegen voor een ander apparaat?`,
                    type: 'confirm',
                    confirmLabel: 'Bijwerken',
                    cancelLabel: 'Nieuwe regel',
                    onConfirm: () => {
                        updateEvent(existingActualIndex, { ...copiedEvent, act: target.act, sceneId: target.sceneId, eventId: target.eventId })
                    },
                    onCancel: () => {
                        // Paste as new rule but without fixture
                        const { fixture, ...rest } = copiedEvent
                        pasteEvent(originalIndex, { ...rest, fixture: '' })
                    }
                })
            } else {
                // No conflict, just paste as new rule
                pasteEvent(originalIndex, copiedEvent)
            }
        }


        const handleDelete = (originalIndex: number, event: ShowEvent) => {
            if (isLocked) return
            const type = event.type?.toLowerCase()

            if (type === 'title') {
                openModal({
                    title: 'Groep Verwijderen',
                    message: `Weet je zeker dat je de gehele groep (${event.act} - ${event.sceneId}.${event.eventId}) wilt verwijderen?`,
                    type: 'confirm',
                    onConfirm: () => {
                        deleteGroup(event.act, event.sceneId, event.eventId);
                        setMenuOpenIndex(null);
                    }
                });
            } else if (type === 'comment') {
                deleteEvent(originalIndex);
                setMenuOpenIndex(null);
            } else {
                openModal({
                    title: 'Actie Verwijderen',
                    message: `Weet je zeker dat je deze actie (${event.fixture || 'Geen device'}) wilt verwijderen?`,
                    type: 'confirm',
                    onConfirm: () => {
                        deleteEvent(originalIndex);
                        setMenuOpenIndex(null);
                    }
                });
            }
        }

        const isRowActive = originalIndex === activeEventIndex
        const isRowSelected = !isLocked && selectedEvent &&
            event.act === selectedEvent.act &&
            event.sceneId === selectedEvent.sceneId &&
            event.eventId === selectedEvent.eventId;

        const isExactSelection = !isLocked && originalIndex === selectedEventIndex;
        const type = event.type?.toLowerCase() || ''
        const status = eventStatuses[originalIndex]
        const videoRef = useRef<HTMLVideoElement>(null)

        const appSettings = useShowStore(s => s.appSettings)
        const serverIp = appSettings.serverIp || window.location.hostname;
        const SOCKET_PORT = appSettings.serverPort || 3001;
        const FILE_PORT = SOCKET_PORT + 1;

        const getMediaUrlWithContext = (path: string) => {
            if (!path) return '';
            if (path.startsWith('http') || path.startsWith('ledshow-file')) return path;
            return `http://${serverIp}:${FILE_PORT}/media?path=${encodeURIComponent(path)}`;
        };

        const getDevices = useCallback(() => appSettings.devices || [], [appSettings.devices])

        const playingMedia = useShowStore(s => s.playingMedia)
        const isActuallyPlaying = useMemo(() => {
            if (type !== 'media' || !event.filename) return false;
            if (isRowActive) return true; // Sequence active is always "live"

            // Check if this file is playing on the target fixture (or any if empty)
            const entries = Object.entries(playingMedia);
            if (event.fixture) {
                const device = getDevices().find(d => d.name === event.fixture);
                if (device && playingMedia[device.id]?.filename === event.filename) return true;
            } else {
                if (entries.some(([_, data]) => data.filename === event.filename)) return true;
            }
            return false;
        }, [type, event.filename, event.fixture, isRowActive, playingMedia, getDevices]);

        const [videoTimes, setVideoTimes] = useState({ current: 0, total: 0 });
        const [isCommentExpanded, setIsCommentExpanded] = useState(false);

        // Sync Playback for Active or Manually Playing Row
        useEffect(() => {
            if (!videoRef.current) return
            if (isActuallyPlaying) {
                // Try to sync with lastTransitionTime if it's the sequence-active row
                if (isRowActive && lastTransitionTime) {
                    const diff = (Date.now() - lastTransitionTime) / 1000;
                    if (diff > 0.1 && diff < 3600 && Math.abs(videoRef.current.currentTime - diff) > 1) {
                        videoRef.current.currentTime = diff;
                    }
                }
                videoRef.current.play().catch(e => console.warn('Preview play failed', e))
            } else {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
            }
        }, [isActuallyPlaying, isRowActive, lastTransitionTime])

        if (!event) return null

        const isDefaultComment = type === 'comment' && (!event.cue || event.cue === 'Opmerkingen' || event.cue === 'Opmerking');
        if (type === 'comment' && isDefaultComment && isLocked) return null;

        return (
            <div
                onClick={() => handleRowClick(originalIndex)}
                onDoubleClick={() => handleRowDoubleClick(originalIndex)}
                className={cn(
                    "group/row relative flex items-center px-4 py-2 transition-all cursor-pointer border-l-2",
                    "border-l-2",
                    isRowActive ? "bg-green-500/20 border-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]" : "border-transparent hover:bg-white/5",
                    isRowSelected && !isRowActive && "bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] z-10",
                    isExactSelection && !isRowActive && "bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] border-white/60 ring-1 ring-blue-400/50 scale-[1.01] z-20",
                    isActiveGroup && !isRowActive && !isRowSelected && "border-l-green-500/30",
                    isNextGroup && !isRowActive && !isRowSelected && "border-l-yellow-500/30",
                    type === 'title' && (
                        isRowActive ? "bg-green-500/10 font-bold" :
                            isNextGroup ? "bg-yellow-500/5 font-bold border-l-yellow-500/50" :
                                "bg-white/5 font-bold border-l-primary/40"
                    ),
                    type === 'comment' && "opacity-60 italic text-[11px]",
                    type === 'action' && "bg-yellow-500/10 border-l-yellow-500 text-yellow-200",
                    type === 'trigger' && "bg-primary/10 border-l-primary text-primary-foreground font-bold"
                )}
            >
                {/* Visual Indicators for Ongoing Effects (Persistence lines) */}
                {ongoingEffects && ongoingEffects.length > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 flex gap-px ml-0.5 pointer-events-none">
                        {ongoingEffects.map((eff, i) => (
                            <div
                                key={eff.id || i}
                                className={cn(
                                    "w-[3px] h-full transition-colors",
                                    eff.type === 'media' ? "bg-blue-500/40" : "bg-purple-500/40"
                                )}
                                title={`Doorlopend: ${eff.type}`}
                            />
                        ))}
                    </div>
                )}
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    {type === 'title' && <Type className="w-3.5 h-3.5 opacity-60" />}
                    {type === 'comment' && <Info className="w-3.5 h-3.5 opacity-60" />}
                    {type === 'action' && <User className="w-3.5 h-3.5 text-yellow-500" />}
                    {type === 'trigger' && <MousePointer2 className="w-3.5 h-3.5 text-primary" />}
                    {type === 'light' && <Lightbulb className="w-3.5 h-3.5 opacity-40 text-purple-400" />}
                    {type === 'media' && <Zap className="w-3.5 h-3.5 opacity-30" />}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                    {editingIndex === originalIndex ? (
                        <>
                            <div className="space-y-1 py-1 relative pr-20" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingIndex(null); }}
                                    className="absolute top-1 right-0 p-1.5 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition-all border border-green-500/30 active:scale-95 z-30 flex items-center gap-1.5 px-2"
                                    title="Klaar met bewerken"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Klaar</span>
                                </button>
                                {type === 'trigger' ? (
                                    <div className="flex-1 flex gap-2">
                                        <select
                                            title="Trigger type"
                                            className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                                            value={event.effect || 'manual'}
                                            onChange={(e) => updateEvent(originalIndex, { effect: e.target.value })}
                                        >
                                            <option value="manual">Handmatige overgang</option>
                                            <option value="timed">Timed (Auto-trigger)</option>
                                            <option value="media">Media afgerond trigger</option>
                                        </select>

                                        {event.effect?.toLowerCase() === 'manual' && (
                                            <RenamableInput className="flex-1 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none focus:bg-white/20" value={event.cue || ''} placeholder="Trigger zin / actie..." onRename={(val) => updateEvent(originalIndex, { cue: val })} />
                                        )}
                                        {event.effect?.toLowerCase() === 'timed' && (
                                            <div className="flex items-center gap-1 flex-1">
                                                <span className="text-[10px] opacity-40">Vertraging:</span>
                                                <RenamableInput className="w-20 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none text-center font-mono" placeholder="MM:SS" value={(event.duration ? Math.floor(event.duration / 60) + ':' + (event.duration % 60).toString().padStart(2, '0') : '0:00')} onRename={(val) => { const parts = val.split(':'); const m = parseInt(parts[0]) || 0; const s = parseInt(parts[1]) || 0; updateEvent(originalIndex, { duration: (m * 60) + s }); }} />
                                            </div>
                                        )}
                                        {event.effect?.toLowerCase() === 'media' && (
                                            <div className="flex-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 flex items-center gap-2">
                                                <SkipForward className="w-3 h-3" /> Wacht op media in dit event...
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {type === 'comment' ? (
                                            <RenamableTextArea autoFocus className="flex-1 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none focus:bg-white/20" value={event.cue || ''} placeholder="Commentaar..." onRename={(val) => updateEvent(originalIndex, { cue: val })} rows={4} />
                                        ) : (
                                            <RenamableInput autoFocus className="flex-1 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none focus:bg-white/20" value={event.cue || ''} placeholder="Event Cue" onRename={(val) => updateEvent(originalIndex, { cue: val })} />
                                        )}
                                        {type === 'title' && (
                                            <div className="flex gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[7px] font-black uppercase tracking-tight opacity-40 ml-1">Duur</span>
                                                    <RenamableInput className="w-16 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none text-center font-mono" placeholder="MM:SS" value={(event.duration ? Math.floor(event.duration / 60) + ':' + (event.duration % 60).toString().padStart(2, '0') : '0:00')} onRename={(val) => { const parts = val.split(':'); const m = parseInt(parts[0]) || 0; const s = parseInt(parts[1]) || 0; updateEvent(originalIndex, { duration: (m * 60) + s }); }} />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[7px] font-black uppercase tracking-tight opacity-40 ml-1">Pg</span>
                                                    <RenamableInput className="w-12 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none text-center" placeholder="Pg" value={(event.scriptPg || 0).toString()} onRename={(val) => updateEvent(originalIndex, { scriptPg: parseInt(val) || 0 })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {type !== 'title' && type !== 'comment' && (
                                <div className="flex flex-col gap-2 w-full">
                                    {type === 'media' && (
                                        <div className="flex-1 flex gap-2 overflow-hidden">
                                            {(() => {
                                                const usedFixtures = (event as any).usedFixtures || []
                                                const filteredScreens = getDevices().filter((d: any) =>
                                                    (d.type === 'local_monitor' || d.type === 'remote_ledwall' || d.type === 'videowall_agent') &&
                                                    (!usedFixtures.includes(d.name) || d.name === event.fixture)
                                                )

                                                return filteredScreens.length === 0 ? (
                                                    <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 text-[10px] text-red-400 italic flex items-center gap-2">
                                                        <AlertCircle className="w-3 h-3" /> Geen schermen
                                                    </div>
                                                ) : (
                                                    <select title="Target Screen" className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none" value={event.fixture || ''} onChange={(e) => updateEvent(originalIndex, { fixture: e.target.value })}>
                                                        <option className="bg-zinc-900" value="">Target...</option>
                                                        {filteredScreens.map((d: any) => (
                                                            <option className="bg-zinc-900" key={d.id} value={d.name}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                )
                                            })()}

                                            <button className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[10px] flex items-center gap-1 transition-colors min-w-[100px] truncate" onClick={async () => { if ((window as any).require) { const { ipcRenderer } = (window as any).require('electron'); const result = await ipcRenderer.invoke('select-file', { filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi'] }] }); if (!result.canceled && result.filePaths.length > 0) { updateEvent(originalIndex, { filename: result.filePaths[0] }) } } }}>
                                                <FolderOpen className="w-3 h-3" /> {event.filename ? event.filename.split(/[\\/]/).pop() : 'bron-video'}
                                            </button>
                                        </div>
                                    )}

                                    {type === 'light' && (
                                        <LightConfigurator
                                            event={event}
                                            updateEvent={(partial) => updateEvent(originalIndex, partial)}
                                            devices={getDevices()}
                                        />
                                    )}

                                    {(type === 'media' || type === 'light') && (
                                        <div className="flex flex-col gap-1.5 p-2 bg-blue-500/5 border border-blue-500/10 rounded mt-1">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 flex-1 max-w-[400px]">
                                                    <span className="text-[9px] opacity-40 uppercase font-black tracking-widest">Stop At:</span>
                                                    <select
                                                        title="Selecteer Stop Event"
                                                        className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-0.5 text-[10px] text-primary outline-none font-bold"
                                                        value={event.stopAct ? `${event.stopAct}-${event.stopSceneId}-${event.stopEventId}` : ''}
                                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                            const val = e.target.value
                                                            if (!val) {
                                                                updateEvent(originalIndex, {
                                                                    stopAct: undefined,
                                                                    stopSceneId: undefined,
                                                                    stopEventId: undefined
                                                                } as any)
                                                            } else {
                                                                const [act, sId, eId] = val.split('-')
                                                                updateEvent(originalIndex, {
                                                                    stopAct: act,
                                                                    stopSceneId: parseInt(sId),
                                                                    stopEventId: parseInt(eId)
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        {events
                                                            .filter((e: ShowEvent, idx: number) => e.type?.toLowerCase() === 'title' && idx > originalIndex)
                                                            .map((titleEvt: ShowEvent, idx: number) => (
                                                                <option key={idx} value={`${titleEvt.act}-${titleEvt.sceneId}-${titleEvt.eventId}`}>
                                                                    {titleEvt.act}.{titleEvt.sceneId}.{titleEvt.eventId} {titleEvt.cue ? `(${titleEvt.cue})` : ''}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {type !== 'media' && type !== 'light' && (
                                        <RenamableInput className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white/60 outline-none" value={event.fixture || ''} placeholder="Fixture / Device" onRename={(val) => updateEvent(originalIndex, { fixture: val })} />
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-4">
                                <div className={cn("text-xs flex items-center gap-2", type === 'action' && "font-black uppercase tracking-wider", type === 'title' && "text-sm text-primary", type !== 'comment' && "truncate")}>
                                    {type === 'comment' ? (
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className={cn(
                                                "whitespace-pre-wrap leading-relaxed",
                                                !isCommentExpanded && "line-clamp-3"
                                            )}>
                                                {event.cue}
                                            </div>
                                            {(event.cue?.split('\n').length || 0) > 3 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsCommentExpanded(!isCommentExpanded) }}
                                                    className="text-[9px] text-primary/60 hover:text-primary font-bold uppercase tracking-tighter w-fit"
                                                >
                                                    {isCommentExpanded ? 'Minder tonen' : 'Lees meer...'}
                                                </button>
                                            )}
                                        </div>
                                    ) : type === 'trigger' ? (
                                        <div className="flex items-center gap-1.5 uppercase tracking-wider font-black">
                                            {event.effect?.toLowerCase() === 'timed' ? (
                                                <div className="flex items-center gap-1.5 text-yellow-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Overgang na timer ({formatTime(event.duration || 0)})</span>
                                                </div>
                                            ) : event.effect?.toLowerCase() === 'media' ? (
                                                <div className="flex items-center gap-1.5 text-blue-400">
                                                    <SkipForward className="w-3.5 h-3.5" />
                                                    <span>Overgang als media is afgerond</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-primary">
                                                    <span>{event.cue || 'Handmatige overgang'}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        event.cue
                                    )}
                                    {type === 'media' && event.filename && (
                                        <span className="text-[9px] opacity-40 font-mono bg-white/5 px-1 rounded truncate max-w-[300px]" title={event.filename}>{event.filename}</span>
                                    )}
                                    {type === 'light' && (
                                        <div className="flex gap-2 items-center">
                                            <span className="text-[9px] opacity-40 font-mono bg-white/5 px-1 rounded">{event.fixture || 'Geen Lamp'}</span>
                                            {event.fixture && getDevices().find(d => d.name === event.fixture)?.type === 'wled' && (
                                                <span className="text-[8px] bg-purple-500/20 text-purple-200 px-1 rounded flex gap-1 items-center">
                                                    WLED <span className="opacity-50">|</span> <span className="font-bold">{event.effect || 'Geen Effect'}</span> <span className="opacity-50">|</span> Bri: {event.brightness}
                                                </span>
                                            )}
                                            {event.fixture && getDevices().find(d => d.name === event.fixture)?.type === 'wiz' && (
                                                <span className="text-[8px] bg-blue-500/20 text-blue-200 px-1 rounded flex gap-1 items-center">
                                                    WIZ <span className="opacity-50">|</span> <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: event.color1 }}></span> <span className="opacity-50">|</span> Bri: {event.brightness}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {(!isLocked || type !== 'title') && (isTimeTracking || (event.duration && event.duration > 0)) && (
                                        <div className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 min-w-[45px] justify-center tabular-nums", isRowActive ? "text-yellow-400 font-bold bg-yellow-500/10 border border-yellow-500/20" : "opacity-40 text-muted-foreground bg-white/5")}>
                                            {(event.duration || 0) > 0 ? (isRowActive && isTimeTracking ? Math.floor(Math.max(0, (event.duration || 0) - Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000)) / 60) + ':' + (Math.max(0, (event.duration || 0) - Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000)) % 60).toString().padStart(2, '0') : Math.floor((event.duration || 0) / 60) + ':' + ((event.duration || 0) % 60).toString().padStart(2, '0')) : (isRowActive && isTimeTracking ? Math.floor(Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000) / 60) + ':' + (Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000) % 60).toString().padStart(2, '0') : '0:00')}
                                        </div>
                                    )}
                                    {type === 'title' && event.scriptPg !== undefined && event.scriptPg > 0 && <div className="text-[10px] font-mono opacity-40 bg-white/5 px-1.5 rounded flex items-center justify-center min-w-[32px]">Pg {event.scriptPg}</div>}
                                </div>
                            </div>
                            {(type !== 'media' && event.fixture) && (type !== 'title' && type !== 'comment') && <div className="text-[10px] opacity-40 truncate">{event.fixture} {event.effect ? `• ${event.effect}` : ''}</div>}
                        </>
                    )}

                    {type === 'media' && (
                        <div className="flex items-center gap-4 mt-2 bg-black/20 p-2 rounded border border-white/5">
                            <div className="text-[9px] opacity-40 truncate flex flex-col gap-0.5 w-24">
                                <div className="font-bold uppercase tracking-wider">Output</div>
                                <div className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {event.fixture || 'Alle'}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-center">
                                <button onClick={(e) => { e.stopPropagation(); restartMedia(originalIndex); }} className="p-2 bg-green-500 text-black rounded-full hover:bg-green-400 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.3)]" title="Start / Play"><Play className="w-3 h-3 fill-black" /></button>
                                <button onClick={(e) => { e.stopPropagation(); stopMedia(originalIndex); }} className="p-2 bg-white/10 hover:bg-red-500 hover:text-white rounded-full transition-colors" title="Stop"><Square className="w-3 h-3 fill-current" /></button>
                                <div className="w-px h-6 bg-white/10 mx-2" />
                                <button onClick={(e) => { e.stopPropagation(); toggleAudio(originalIndex) }} className={cn("p-1.5 rounded transition-colors", event.sound ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-500")} title="Mute/Unmute">{!event.sound ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}</button>
                                <div className="flex items-center gap-0.5 bg-white/5 rounded p-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); setMediaVolume(originalIndex, Math.max(0, (event.intensity !== undefined ? event.intensity : 100) - 10)); }} className="p-1 hover:bg-white/10 rounded w-5 h-5 flex items-center justify-center text-white/60 hover:text-white">-</button>
                                    <span className="text-[10px] w-6 text-center tabular-nums font-mono opacity-60">{event.intensity !== undefined ? event.intensity : 100}%</span>
                                    <button onClick={(e) => { e.stopPropagation(); setMediaVolume(originalIndex, Math.min(100, (event.intensity !== undefined ? event.intensity : 100) + 10)); }} className="p-1 hover:bg-white/10 rounded w-5 h-5 flex items-center justify-center text-white/60 hover:text-white">+</button>
                                </div>
                                <div className="w-px h-6 bg-white/10 mx-2" />
                                <button onClick={(e) => { e.stopPropagation(); toggleRepeat(originalIndex) }} className={cn("p-1.5 rounded transition-colors", event.effect === 'repeat' ? "bg-green-500/20 text-green-500" : "bg-white/10 text-white/40")} title="Repeat"><Repeat className="w-3.5 h-3.5" /></button>
                            </div>
                            {event.filename && (
                                <div className="w-32 aspect-video bg-black rounded border border-white/10 overflow-hidden relative group/preview">
                                    <video
                                        ref={videoRef}
                                        src={getMediaUrlWithContext(event.filename)}
                                        className="w-full h-full object-cover"
                                        muted
                                        onTimeUpdate={(e) => {
                                            const v = e.currentTarget;
                                            if (v.duration) {
                                                const progress = (v.currentTime / v.duration) * 100;
                                                const bar = v.parentElement?.querySelector('.video-progress-bar') as HTMLElement;
                                                if (bar) bar.style.width = `${progress}%`;
                                                setVideoTimes({ current: Math.floor(v.currentTime), total: Math.floor(v.duration) });
                                            }
                                        }}
                                        onLoadedMetadata={(e) => {
                                            const v = e.currentTarget;
                                            setVideoTimes({ current: 0, total: Math.floor(v.duration) });
                                        }}
                                    />
                                    {event.fixture && getDevices().find((d: Device) => d.name === event.fixture)?.type === 'videowall_agent' && (
                                        <VideoWallPreviewOverlay
                                            layout={(getDevices().find((d: Device) => d.name === event.fixture) as any)?.layout || '1x1'}
                                            bezelSize={(getDevices().find((d: Device) => d.name === event.fixture) as any)?.bezelSize}
                                        />
                                    )}
                                    <div className={cn(
                                        "absolute top-1 right-1 px-1 text-[7px] font-black rounded uppercase tracking-wider transition-colors",
                                        isActuallyPlaying && isLocked ? "bg-red-500 text-white animate-pulse" : "bg-black/60 text-white/50"
                                    )}>
                                        {isActuallyPlaying && isLocked ? 'Live' : 'Preview'}
                                    </div>

                                    {/* Numeric Time Overlay */}
                                    <div className="absolute top-1 left-1 px-1 bg-black/60 text-[7px] font-mono rounded text-white/70 tabular-nums">
                                        {Math.floor(videoTimes.current / 60)}:{(videoTimes.current % 60).toString().padStart(2, '0')} / {Math.floor(videoTimes.total / 60)}:{(videoTimes.total % 60).toString().padStart(2, '0')}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                                        <div className="video-progress-bar h-full bg-primary transition-[width] duration-300 ease-linear" style={{ width: '0%' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {(type === 'light' || type === 'media') && status && (
                    <div className="flex-shrink-0 px-2 flex items-center gap-1.5 overflow-hidden">
                        {status === 'sending' && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-400 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Sending</div>}
                        {status === 'ok' && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-green-400"><Check className="w-3 h-3" /> OK</div>}
                        {status === 'failed' && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500"><AlertCircle className="w-3 h-3" /> Failed</div>}
                    </div>
                )}

                <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    {editingIndex === originalIndex ? null : (
                        <div className="relative">
                            {!isLocked || (type === 'light' || type === 'media') ? (
                                <button id={`row-menu-${originalIndex}`} onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === originalIndex ? null : originalIndex) }} title="Context Menu" className="p-1 hover:bg-white/10 rounded"><MoreVertical className="w-3.5 h-3.5" /></button>
                            ) : null}
                            {menuOpenIndex === originalIndex && (
                                <ContextMenu
                                    index={originalIndex}
                                    event={event}
                                    type={type}
                                    isLocked={isLocked}
                                    onClose={() => setMenuOpenIndex(null)}
                                    anchorRect={document.getElementById(`row-menu-${originalIndex}`)?.getBoundingClientRect() || undefined}
                                    handlers={{
                                        setEditingIndex, resendEvent, renameAct, renameScene, moveAct, moveScene, moveEvent,
                                        insertAct, insertScene, insertEvent, addEventAbove, addEventBelow, addCommentToEvent, handleDelete,
                                        restartMedia, stopMedia, toggleAudio, toggleRepeat, copyToClipboard, loadClipboard,
                                        pasteFromClipboard
                                    }}
                                    clipboard={clipboard}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }



// Context menu for Acts and Scenes
const HeaderContextMenu: React.FC<{
    type: 'act' | 'scene'
    id: string
    onClose: () => void
    anchorRect?: DOMRect
    handlers: any
    act?: any
    scene?: any
    actId?: string
    sceneId?: number
}> = ({ type, onClose, anchorRect, handlers, act, scene, actId, sceneId }) => {
    const menuRef = useRef<HTMLDivElement>(null)
    const openModal = useShowStore(s => s.openModal)

    if (!anchorRect) return null

    const menuContent = (
        <div
            ref={menuRef}
            className="fixed w-52 glass border border-white/10 rounded-lg shadow-2xl py-1 z-[9999]"
            style={{
                top: `${anchorRect.bottom + 4}px`,
                left: `${anchorRect.right - 208}px`
            }}
        >
            {type === 'act' && (
                <>
                    <button onClick={() => {
                        const firstIdx = act.scenes[0]?.events[0]?.rows[0]?.originalIndex ?? 0
                        handlers.insertAct(firstIdx, 'before'); onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                        <Plus className="w-3 h-3 text-green-400" /> Act invoegen voor
                    </button>
                    <button onClick={() => {
                        const lastScene = act.scenes[act.scenes.length - 1]
                        const lastEventNode = lastScene?.events[lastScene.events.length - 1]
                        const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                        if (lastRow) handlers.insertAct(lastRow.originalIndex, 'after');
                        onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                        <Plus className="w-3 h-3 text-green-400" /> Act invoegen na
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button onClick={() => {
                        openModal({
                            title: 'Act Verwijderen',
                            message: `Weet je zeker dat je Act "${act.id}" en alle inhoud wilt verwijderen?`,
                            type: 'confirm',
                            onConfirm: () => handlers.deleteAct(act.id)
                        });
                        onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-red-500">
                        <Trash2 className="w-3 h-3" /> Act verwijderen
                    </button>
                </>
            )}

            {type === 'scene' && (
                <>
                    <button onClick={() => {
                        const firstIdx = scene.events[0]?.rows[0]?.originalIndex ?? 0
                        handlers.insertScene(firstIdx, 'before'); onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                        <Plus className="w-3 h-3 text-green-400" /> Scene invoegen voor
                    </button>
                    <button onClick={() => {
                        const lastEventNode = scene.events[scene.events.length - 1]
                        const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                        if (lastRow) handlers.insertScene(lastRow.originalIndex, 'after');
                        onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                        <Plus className="w-3 h-3 text-green-400" /> Scene invoegen na
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button onClick={() => {
                        if (act.scenes.length <= 1) {
                            handlers.addToast('Je kunt de laatste scene in een Act niet verwijderen.', 'warning');
                            onClose();
                            return;
                        }
                        openModal({
                            title: 'Scene Verwijderen',
                            message: `Weet je zeker dat je Scene ${sceneId} (in ${actId}) wilt verwijderen?`,
                            type: 'confirm',
                            onConfirm: () => handlers.deleteScene(actId, sceneId)
                        });
                        onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-red-500">
                        <Trash2 className="w-3 h-3" /> Scene verwijderen
                    </button>
                </>
            )}
        </div>
    )

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            {menuContent}
        </>,
        document.getElementById('portal-root')!
    )
}

// Sub-component for the context menu to handle complex logic and sub-menus
const ContextMenu: React.FC<{
    index: number
    event: ShowEvent
    type: string
    isLocked: boolean
    onClose: () => void
    anchorRect?: DOMRect
    handlers: {
        setEditingIndex: (i: number | null) => void
        resendEvent: (i: number) => void
        renameAct: (oldName: string, newName: string) => void
        renameScene: (actName: string, sceneId: number, newDescription: string) => void
        moveAct: (actName: string, direction: 'up' | 'down') => void
        moveScene: (actName: string, sceneId: number, direction: 'up' | 'down') => void
        moveEvent: (index: number, direction: 'up' | 'down') => void
        insertAct: (i: number, p: 'before' | 'after') => void
        insertScene: (i: number, p: 'before' | 'after') => void
        insertEvent: (i: number, p: 'before' | 'after') => void
        addEventAbove: (i: number, type?: string, cue?: string) => void
        addEventBelow: (i: number, type?: string, cue?: string) => void
        addCommentToEvent: (index: number) => void
        handleDelete: (i: number, e: ShowEvent) => void
        restartMedia: (i: number) => void
        stopMedia: (i: number) => void
        toggleAudio: (i: number) => void
        toggleRepeat: (i: number) => void
        copyToClipboard: (event: ShowEvent) => Promise<void>
        loadClipboard: () => Promise<void>
        pasteFromClipboard: (item: ClipboardItem, targetEvent: ShowEvent) => void
    }
    clipboard: ClipboardItem[]
}> = ({ index, event, type, isLocked, onClose, anchorRect, handlers, clipboard }) => {
    const [subMenu, setSubMenu] = useState<'construct' | 'rows' | 'media' | 'clipboard' | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [isFlipped, setIsFlipped] = useState(false)

    useEffect(() => {
        if (anchorRect && subMenu === 'clipboard') {
            handlers.loadClipboard()
        }
    }, [subMenu])

    useEffect(() => {
        if (menuRef.current && anchorRect) {
            const menuHeight = menuRef.current.offsetHeight
            if (anchorRect.bottom + menuHeight > window.innerHeight - 20) {
                setIsFlipped(true)
            } else {
                setIsFlipped(false)
            }
        }
    }, [anchorRect])

    if (!anchorRect) return null

    const menuContent = (
        <div
            ref={menuRef}
            className={cn(
                "fixed w-52 glass border border-white/10 rounded-lg shadow-2xl py-1 z-[9999] overflow-visible",
            )}
            style={{
                // eslint-disable-next-line react/no-unknown-property
                '--menu-top': `${isFlipped ? (anchorRect.top - (menuRef.current?.offsetHeight || 0) - 4) : (anchorRect.bottom + 4)}px`,
                // eslint-disable-next-line react/no-unknown-property
                '--menu-left': `${anchorRect.right - 208}px`,
                top: 'var(--menu-top)',
                left: 'var(--menu-left)'
            } as React.CSSProperties}
        >
            {!isLocked && (
                <button onClick={() => { handlers.setEditingIndex(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                    <Edit2 className="w-3 h-3" /> Bewerken
                </button>
            )}

            {!isLocked && (type === 'light' || type === 'media' || type === 'action') && (
                <button
                    onClick={() => { handlers.copyToClipboard(event); onClose(); }}
                    className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"
                >
                    <Copy className="w-3 h-3" /> Kopiëren naar buffer
                </button>
            )}

            {!isLocked && (
                <div className="relative group/sub">
                    <button
                        onMouseEnter={() => setSubMenu('clipboard')}
                        className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <ClipboardPaste className="w-3 h-3" /> Plakken uit buffer...
                        </div>
                        <ChevronRight className="w-2.5 h-2.5 opacity-30" />
                    </button>
                    {subMenu === 'clipboard' && (
                        <div className={cn(
                            "absolute right-full w-64 glass border border-white/10 rounded-lg shadow-2xl py-1 mr-1 max-h-[300px] overflow-y-auto",
                            isFlipped ? "bottom-0" : "top-0"
                        )}>
                            {clipboard.length === 0 ? (
                                <div className="px-3 py-2 text-[10px] text-white/40 italic text-center">Buffer is leeg</div>
                            ) : (
                                clipboard.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { handlers.pasteFromClipboard(item, event); onClose(); }}
                                        className="w-full px-3 py-2 text-left text-[10px] hover:bg-white/5 border-b border-white/5 last:border-0"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-primary uppercase">{item.type}</span>
                                            <span className="opacity-30 flex items-center gap-1">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="opacity-60 truncate">
                                            {item.data.fixture || 'Geen device'} - {item.data.cue || 'Geen cue'}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {(type === 'light' || type === 'media' || type === 'action') && (
                <button onClick={() => { handlers.resendEvent(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-blue-400">
                    <Send className="w-3 h-3" /> Herzenden
                </button>
            )}


            {!isLocked && (
                <>
                    <div className="h-px bg-white/5 my-1" />

                    {/* Event Level Actions */}
                    {type === 'title' && (
                        <>
                            <button onClick={() => { handlers.insertEvent(index, 'before'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                                <Plus className="w-3 h-3 text-green-400" /> Event invoegen voor
                            </button>
                            <button onClick={() => { handlers.insertEvent(index, 'after'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                                <Plus className="w-3 h-3 text-green-400" /> Event invoegen na
                            </button>
                            <button onClick={() => { handlers.addCommentToEvent(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                                <Info className="w-3 h-3 text-blue-400" /> Commentaarregel toevoegen
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                        </>
                    )}

                    <div className="relative group/sub">
                        <button
                            onMouseEnter={() => setSubMenu('construct')}
                            className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-yellow-400" /> Actie toevoegen...
                            </div>
                            <ChevronRight className="w-2.5 h-2.5 opacity-30" />
                        </button>
                        {subMenu === 'construct' && (
                            <div className={cn(
                                "absolute right-full w-40 glass border border-white/10 rounded-lg shadow-2xl py-1 mr-1",
                                isFlipped ? "bottom-0" : "top-0"
                            )}>
                                <button onClick={() => { handlers.addEventBelow(index, 'Action', 'Aktie'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><User className="w-3 h-3 text-blue-400" /> Aktie </button>
                                <button onClick={() => { handlers.addEventBelow(index, 'Light', 'Licht'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Lightbulb className="w-3 h-3 text-yellow-400" /> Licht </button>
                                <button onClick={() => { handlers.addEventBelow(index, 'Media', 'Media'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Layers className="w-3 h-3 text-purple-400" /> Media </button>
                                <button onClick={() => { handlers.addEventBelow(index, 'Trigger', 'Handmatige overgang'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><MousePointer2 className="w-3 h-3 text-primary" /> Trigger </button>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-white/5 my-1" />

                    <button onClick={() => { handlers.handleDelete(index, event); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-red-500">
                        <Trash2 className="w-3 h-3" /> {type === 'comment' ? 'Commentaar verwijderen' : type === 'title' ? 'Event verwijderen' : 'Actie verwijderen'}
                    </button>
                </>
            )}
        </div>
    )

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            {menuContent}
        </>,
        document.getElementById('portal-root')!
    )
}

const SequenceGrid: React.FC = () => {
    const {
        events,
        activeEventIndex,
        setActiveEvent,
        activeShow,
        isLocked,
        deleteAct,
        deleteScene,
        openModal,
        toggleCollapse,
        runtimeCollapsedGroups,
        eventStatuses,
    } = useShowStore() as any

    const selectedEventIndex = useShowStore(s => s.selectedEventIndex)
    const setSelectedEvent = useShowStore(s => s.setSelectedEvent)
    const selectedEvent = events[selectedEventIndex] || null;

    const lastTransitionTime = useShowStore(s => s.lastTransitionTime)

    // Actions
    const deleteGroup = useShowStore(s => s.deleteGroup)
    const renameAct = useShowStore(s => s.renameAct)
    const renameScene = useShowStore(s => s.renameScene)
    const moveAct = useShowStore(s => s.moveAct)
    const moveScene = useShowStore(s => s.moveScene)
    const moveEvent = useShowStore(s => s.moveEvent)
    const insertAct = useShowStore(s => s.insertAct)
    const insertScene = useShowStore(s => s.insertScene)
    const insertEvent = useShowStore(s => s.insertEvent)
    const addToast = useShowStore(s => s.addToast)


    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | string | null>(null)

    // Clear editing/menu when locked (Show Mode)
    useEffect(() => {
        if (isLocked) {
            setEditingIndex(null)
            setMenuOpenIndex(null)
        }
    }, [isLocked])

    // Dynamic Collapse State Logic
    const collapsedGroups = isLocked
        ? (runtimeCollapsedGroups || {})
        : (activeShow?.viewState?.collapsedGroups || {})

    // Ensure currentTime is available or use new Date if store doesn't provide it live (it does usually if subbed)
    // Actually useShowStore has `currentTime`? NO. App.tsx has `currentTime`.
    // SequenceGrid needs `currentTime`.
    // I should add `currentTime` to `useShowStore` or pass it?
    // `useShowStore` doesn't have `currentTime`.
    // But `SequenceGrid` uses `currentTime`. Where did it come from? 
    // In previous view_file, line 100+...
    // Let's check where `currentTime` came from in `SequenceGrid`.
    // It's likely using `new Date()` in an interval or prop?
    // In the view_file of SequenceGrid (line 1-100), I didn't see `currentTime` logic.
    // Line 122: `const [currentTime, setCurrentTime] = useState(new Date())` likely exists deeper?
    // Let's assume I need to add that state to SequenceGrid if it was removed or missing.
    // Or I should add it.



    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])







    const containerRef = useRef<HTMLDivElement>(null)
    const activeGroupRef = useRef<HTMLDivElement>(null)

    // Auto-scroll logic
    useEffect(() => {
        // Only auto-scroll if locked AND NOT currently editing something
        if (isLocked && activeGroupRef.current && editingIndex === null) {
            activeGroupRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
    }, [activeEventIndex, editingIndex, isLocked])



    // Hierarchical Data Structure
    interface EventRow {
        event: ShowEvent
        originalIndex: number
        id: number
    }

    interface EventNode {
        id: number // eventId
        uniqueId: string // act-scene-event
        rows: EventRow[]
        isActive: boolean
        isNext: boolean
        duration: number // saved duration for this event (from Title row)
        activeDuration: number // duration of the active event (for next-node blinking)
        isMinimal: boolean
        ongoingEffects?: { type: 'media' | 'light', id: string }[]
    }

    interface SceneNode {
        id: number // sceneId
        events: EventNode[]
        isActive: boolean
    }

    interface ActNode {
        id: string // "Act 1"
        scenes: SceneNode[]
        isActive: boolean
    }

    // Build Hierarchy
    const hierarchy = useMemo(() => {
        const acts: ActNode[] = []
        const eventNodeMap = new Map<number, { act: ActNode, scene: SceneNode, eventNode: EventNode }>()

        // 1. Build Hierarchy
        events.forEach((event: ShowEvent, index: number) => {
            // Find or Create Act
            let act = acts.find(a => a.id === event.act)
            if (!act) {
                act = { id: event.act, scenes: [], isActive: false }
                acts.push(act)
            }

            // Find or Create Scene
            let scene = act.scenes.find(s => s.id === event.sceneId)
            if (!scene) {
                scene = { id: event.sceneId, events: [], isActive: false }
                act.scenes.push(scene)
            }

            // Find or Create Event Node
            const uniqueId = `${event.act}-${event.sceneId}-${event.eventId}`
            let eventNode = scene.events.find(e => e.uniqueId === uniqueId)
            if (!eventNode) {
                eventNode = { id: event.eventId, uniqueId, rows: [], isActive: false, isNext: false, duration: 0, activeDuration: 0, isMinimal: false }
                scene.events.push(eventNode)
            }

            // Add Row
            eventNode.rows.push({ event, originalIndex: index, id: index })
            eventNodeMap.set(index, { act, scene, eventNode })
        })

        // 2. Determine Active and Next Status
        // Flatten all event nodes in order for easy next-finding
        const allEventNodes: { act: ActNode, scene: SceneNode, eventNode: EventNode }[] = []
        for (const act of acts) {
            for (const scene of act.scenes) {
                for (const eventNode of scene.events) {
                    allEventNodes.push({ act, scene, eventNode })
                }
            }
        }

        // Find active event node (the one containing the activeEventIndex row)
        let activeNodeIdx = -1
        if (activeEventIndex >= 0) {
            activeNodeIdx = allEventNodes.findIndex(({ eventNode }) =>
                eventNode.rows.some(r => r.originalIndex === activeEventIndex)
            )
        }

        // Mark active (act + scene + event)
        if (activeNodeIdx >= 0) {
            const { act, scene, eventNode } = allEventNodes[activeNodeIdx]
            act.isActive = true
            scene.isActive = true
            eventNode.isActive = true
        }

        // Mark next event node ONLY (no act/scene next indicators)
        if (activeNodeIdx >= 0 && activeNodeIdx < allEventNodes.length - 1) {
            allEventNodes[activeNodeIdx + 1].eventNode.isNext = true
        } else if (activeEventIndex === -1 && allEventNodes.length > 0) {
            // At startup / after stop: first event is "next"
            allEventNodes[0].eventNode.isNext = true
        }

        // 3. Calculate durations and minimal flag for each event node
        const getEffectiveDuration = (node: EventNode) => {
            const triggerRow = node.rows.find(r => r.event.type?.toLowerCase() === 'trigger')
            if (triggerRow?.event.effect?.toLowerCase() === 'timed') return triggerRow.event.duration || 0

            const titleRow = node.rows.find(r => r.event.type?.toLowerCase() === 'title')
            if (titleRow?.event.duration) return titleRow.event.duration

            return 0
        }

        const activeDuration = activeNodeIdx >= 0 ? getEffectiveDuration(allEventNodes[activeNodeIdx].eventNode) : 0

        for (const { eventNode } of allEventNodes) {
            eventNode.duration = getEffectiveDuration(eventNode)
            eventNode.isMinimal = !eventNode.rows.some(r => {
                const t = r.event.type?.toLowerCase()
                return t === 'action' || t === 'media' || t === 'light' || t === 'comment'
            })

            // Store the active event's duration on the "next" node so it can blink when elapsed
            if (eventNode.isNext) {
                eventNode.activeDuration = activeDuration
            }
        }

        // 4. Calculate persistent effect spans
        allEventNodes.forEach((node, nodeIdx) => {
            node.eventNode.rows.forEach(row => {
                const evt = row.event
                if ((evt.type?.toLowerCase() === 'media' || evt.type?.toLowerCase() === 'light') && evt.stopAct) {
                    const stopUniqueId = `${evt.stopAct}-${evt.stopSceneId}-${evt.stopEventId}`
                    let endNodeIdx = -1
                    for (let i = nodeIdx + 1; i < allEventNodes.length; i++) {
                        if (allEventNodes[i].eventNode.uniqueId === stopUniqueId) {
                            endNodeIdx = i
                            break
                        }
                    }

                    if (endNodeIdx !== -1) {
                        // Mark all nodes from start up to (but not including) stop event
                        for (let i = nodeIdx; i < endNodeIdx; i++) {
                            const n = allEventNodes[i].eventNode
                            if (!n.ongoingEffects) n.ongoingEffects = []
                            n.ongoingEffects.push({
                                type: evt.type?.toLowerCase() as 'media' | 'light',
                                id: `${evt.act}-${evt.sceneId}-${evt.eventId}-${row.id}`
                            })
                        }
                    }
                }
            })
        })

        // 5. Sort rows within events
        acts.forEach(act => {
            act.scenes.forEach(scene => {
                scene.events.forEach(eventNode => {
                    eventNode.rows.sort((a, b) => {
                        const getPriority = (type?: string) => {
                            const t = (type || '').toLowerCase()
                            if (t === 'title') return 1
                            if (t === 'comment') return 2
                            if (t === 'action') return 3
                            if (t === 'media') return 4
                            if (t === 'light') return 5
                            if (t === 'trigger') return 6
                            return 99
                        }
                        const priorityA = getPriority(a.event.type)
                        const priorityB = getPriority(b.event.type)
                        if (priorityA !== priorityB) return priorityA - priorityB
                        return (a.event.fixture || '').localeCompare(b.event.fixture || '')
                    })
                })
            })
        })

        return acts
    }, [events, activeEventIndex])

    const handleRowClick = (index: number) => {
        if (!isLocked) {
            setSelectedEvent(index)
            setEditingIndex(index)
        }
    }

    const handleRowDoubleClick = (originalIndex: number) => {
        // Double click ALWAYS activates (even in locked mode)
        setActiveEvent(originalIndex)
    }







    return (
        <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-6 custom-scrollbar bg-black/20 scroll-smooth relative">
            {/* Time Tracking Toolbar removed (moved to App Header) */}
            {hierarchy.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40 italic text-sm">
                    Geen sequence data gevonden
                </div>
            )}

            {hierarchy.map((act) => {
                // Dynamic Collapse: everything collapsed except active and next group during playback
                const actCollapsed = collapsedGroups[`act-${act.id}`]

                return (
                    <div key={act.id} className="relative group/act text-sm mb-6">
                        {/* ACT Header */}
                        <div className="sticky top-0 z-20 flex items-center justify-between bg-[#111] border-l-4 border-primary px-4 py-2 mb-2 shadow-lg group-hover/act:bg-[#1a1a1a] transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleCollapse(`act-${act.id}`) }}
                                    className="p-0.5 hover:bg-white/10 rounded"
                                >
                                    {actCollapsed ? <ChevronRight className="w-4 h-4 opacity-70" /> : <ChevronDown className="w-4 h-4 opacity-70" />}
                                </button>

                                {!isLocked ? (
                                    <RenamableInput
                                        className="bg-transparent font-black text-primary uppercase tracking-widest outline-none border-b border-transparent focus:border-primary/50 w-full max-w-[200px]"
                                        value={act.id}
                                        onRename={(val) => renameAct(act.id, val)}
                                    />
                                ) : (
                                    <span className="font-black text-primary uppercase tracking-widest">{act.id}</span>
                                )}
                                {act.isActive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            </div>

                            {/* Act Controls (Unlocked) */}
                            {!isLocked && (
                                <div className="flex items-center gap-1.5 opacity-0 group-hover/act:opacity-100 transition-opacity ml-2">
                                    <div className="flex flex-col gap-px">
                                        <button onClick={() => moveAct(act.id, 'up')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Act Omhoog"><ArrowUp className="w-3 h-3" /></button>
                                        <button onClick={() => moveAct(act.id, 'down')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Act Omlaag"><ArrowDown className="w-3 h-3" /></button>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div className="flex flex-col gap-px">
                                        <button onClick={() => {
                                            const firstEventIdx = act.scenes[0]?.events[0]?.rows[0]?.originalIndex ?? 0
                                            insertAct(firstEventIdx, 'before')
                                        }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Act In (Voor)"><Plus className="w-3 h-3" /></button>
                                        <button onClick={() => {
                                            const lastScene = act.scenes[act.scenes.length - 1]
                                            const lastEventNode = lastScene?.events[lastScene.events.length - 1]
                                            const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                                            if (lastRow) insertAct(lastRow.originalIndex, 'after')
                                        }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Act In (Na)"><Plus className="w-3 h-3" /></button>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <button
                                        id={`act-menu-${act.id}`}
                                        onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(`act-${act.id}`) }}
                                        title="Act Menu"
                                        className="p-1 hover:bg-white/10 rounded"
                                    >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {menuOpenIndex === `act-${act.id}` && (
                                        <HeaderContextMenu
                                            type="act"
                                            id={act.id}
                                            onClose={() => setMenuOpenIndex(null)}
                                            anchorRect={document.getElementById(`act-menu-${act.id}`)?.getBoundingClientRect() || undefined}
                                            handlers={{ insertAct, deleteAct, moveAct, addToast }}
                                            act={act}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {!actCollapsed && (
                            <div className="pl-4 space-y-4 border-l border-white/5 ml-2">
                                {act.scenes.map((scene) => {
                                    const firstEvent = scene.events[0]?.rows[0]?.event
                                    const sceneDesc = activeShow?.viewState?.sceneNames?.[`${act.id}-${scene.id}`] || (firstEvent?.type?.toLowerCase() === 'title' ? firstEvent.cue : '') || ''

                                    // Dynamic Collapse
                                    const sceneCollapsed = collapsedGroups[`scene-${act.id}-${scene.id}`]

                                    return (
                                        <div key={scene.id} className="relative group/scene">
                                            {/* SCENE Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded text-xs font-bold text-muted-foreground uppercase tracking-wider flex-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleCollapse(`scene-${act.id}-${scene.id}`) }}
                                                        className="p-0.5 hover:bg-white/10 rounded -ml-1"
                                                    >
                                                        {sceneCollapsed ? <ChevronRight className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
                                                    </button>
                                                    <span className="whitespace-nowrap">Scene {scene.id}</span>
                                                    {!isLocked ? (
                                                        <>
                                                            <span className="opacity-20 mx-1">-</span>
                                                            <RenamableInput
                                                                className="bg-transparent flex-1 outline-none text-primary/80 placeholder:text-white/20 min-w-[200px]"
                                                                placeholder="..."
                                                                value={sceneDesc}
                                                                onRename={(val) => renameScene(act.id, scene.id, val)}
                                                            />
                                                        </>
                                                    ) : (
                                                        sceneDesc && <span className="text-primary/60 normal-case ml-2">- {sceneDesc}</span>
                                                    )}
                                                    {scene.isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />}
                                                </div>

                                                {!isLocked && (
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover/scene:opacity-100 transition-opacity ml-2">
                                                        <div className="flex flex-col gap-px">
                                                            <button onClick={() => moveScene(act.id, scene.id, 'up')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Scene Omhoog"><ArrowUp className="w-3 h-3" /></button>
                                                            <button onClick={() => moveScene(act.id, scene.id, 'down')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Scene Omlaag"><ArrowDown className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="w-px h-6 bg-white/10" />

                                                        <button
                                                            id={`scene-menu-${act.id}-${scene.id}`}
                                                            onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(`scene-${act.id}-${scene.id}`) }}
                                                            title="Scene Menu"
                                                            className="p-1 hover:bg-white/10 rounded"
                                                        >
                                                            <MoreVertical className="w-3.5 h-3.5" />
                                                        </button>

                                                        {menuOpenIndex === `scene-${act.id}-${scene.id}` && (
                                                            <HeaderContextMenu
                                                                type="scene"
                                                                id={`${act.id}-${scene.id}`}
                                                                onClose={() => setMenuOpenIndex(null)}
                                                                anchorRect={document.getElementById(`scene-menu-${act.id}-${scene.id}`)?.getBoundingClientRect() || undefined}
                                                                handlers={{ insertScene, deleteScene, moveScene, addToast }}
                                                                actId={act.id}
                                                                sceneId={scene.id}
                                                                scene={scene}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {!sceneCollapsed && (
                                                <div className="pl-4 space-y-3">
                                                    {scene.events.map((eventNode) => {
                                                        // Dynamic Collapse
                                                        // If minimal (only Title + Trigger), collapse by default in Show Mode
                                                        const eventCollapsed = collapsedGroups[eventNode.uniqueId] ?? (isLocked && eventNode.isMinimal)

                                                        const titleRow = eventNode.rows.find(r => r.event.type?.toLowerCase() === 'title')
                                                        const otherRows = eventNode.rows.filter(r => r.event.type?.toLowerCase() !== 'title')

                                                        // Calculate summary for header tags
                                                        const summaryCounts = otherRows.reduce((acc, r) => {
                                                            const t = r.event.type?.toLowerCase() || 'unknown'
                                                            acc[t] = (acc[t] || 0) + 1
                                                            return acc
                                                        }, {} as Record<string, number>)

                                                        // Timing calculations using pre-computed data from useMemo
                                                        const eventDuration = eventNode.duration

                                                        // Check if the active event's timing has elapsed (for blinking "Next")
                                                        let activeTimeElapsed = false
                                                        if (eventNode.isNext && eventNode.activeDuration > 0 && lastTransitionTime) {
                                                            const elapsed = Math.round((currentTime.getTime() - lastTransitionTime) / 1000)
                                                            activeTimeElapsed = elapsed >= eventNode.activeDuration
                                                        }

                                                        // Calculate remaining time for the active event countdown
                                                        let remainingTime = 0
                                                        let showCountdown = false
                                                        if (eventNode.isActive && eventDuration > 0 && lastTransitionTime) {
                                                            const elapsed = Math.round((currentTime.getTime() - lastTransitionTime) / 1000)
                                                            remainingTime = Math.max(0, eventDuration - elapsed)
                                                            showCountdown = true
                                                        }

                                                        return (
                                                            <div
                                                                key={eventNode.uniqueId}
                                                                ref={eventNode.isActive ? activeGroupRef : null}
                                                                className={cn(
                                                                    "relative rounded-lg transition-all duration-300 border border-white/5 overflow-hidden group/event",
                                                                    eventNode.isActive ? "bg-green-500/5 border-green-500/30 ring-1 ring-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]" :
                                                                        eventNode.isNext ? "bg-yellow-500/5 border-yellow-500/30 ring-1 ring-yellow-500/20" :
                                                                            "bg-black/20 hover:bg-white/5",
                                                                )}
                                                            >
                                                                {/* Event Header */}
                                                                <div className="px-3 py-1.5 bg-black/40 flex items-center justify-between border-b border-white/5">
                                                                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); toggleCollapse(eventNode.uniqueId) }}
                                                                            className="p-1 hover:bg-white/10 rounded -ml-1"
                                                                        >
                                                                            {eventCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                        <span className="font-bold text-purple-400">{act.id}.{scene.id}.{eventNode.id}</span>
                                                                        <span className="opacity-40">|</span>                                                                        {/* Transition status removed per feedback */}
                                                                        {titleRow?.event.cue && (
                                                                            <>
                                                                                <span className="opacity-40">|</span>
                                                                                <span className="text-orange-500 font-bold truncate max-w-[300px]">{titleRow.event.cue}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mr-2">
                                                                        {/* Meta Tags */}
                                                                        {titleRow?.event.scriptPg !== undefined && titleRow.event.scriptPg > 0 && (
                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] font-bold text-blue-300">
                                                                                Pg {titleRow.event.scriptPg}
                                                                            </div>
                                                                        )}

                                                                        {summaryCounts['comment'] > 0 && (
                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] opacity-60">
                                                                                <Info className="w-3 h-3" /> {summaryCounts['comment']}
                                                                            </div>
                                                                        )}
                                                                        {summaryCounts['light'] > 0 && (
                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-[9px] text-purple-200">
                                                                                <Lightbulb className="w-3 h-3" /> {summaryCounts['light']}
                                                                            </div>
                                                                        )}
                                                                        {summaryCounts['media'] > 0 && (
                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] text-blue-200">
                                                                                <Play className="w-3 h-3" /> {summaryCounts['media']}
                                                                            </div>
                                                                        )}

                                                                        <div className="w-px h-4 bg-white/10 mx-1" />

                                                                        {/* Timing Display */}
                                                                        {eventNode.isActive && showCountdown && (
                                                                            <span className={cn(
                                                                                "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tabular-nums",
                                                                                remainingTime === 0 ? "text-red-400 bg-red-500/10 border border-red-500/20 animate-bright-pulse" : "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
                                                                            )}>
                                                                                <span className="opacity-50 mr-1 italic">ToGo:</span>{formatTime(remainingTime)}
                                                                            </span>
                                                                        )}

                                                                        {eventNode.isActive && !showCountdown && (
                                                                            <span className="text-[9px] font-black uppercase text-primary animate-bright-pulse">Active</span>
                                                                        )}

                                                                        {eventNode.isNext && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                {eventDuration > 0 && (
                                                                                    <span className="text-[9px] font-mono opacity-40 tabular-nums">
                                                                                        <span className="opacity-50 mr-1 italic">Duur:</span>{formatTime(eventDuration)}
                                                                                    </span>
                                                                                )}
                                                                                <span className={cn(
                                                                                    "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                                                                    activeTimeElapsed
                                                                                        ? "text-white bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-bright-pulse"
                                                                                        : "text-orange-400 animate-bright-pulse"
                                                                                )}>
                                                                                    Next
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {/* Event Controls */}
                                                                        {!isLocked && (
                                                                            <div className="flex items-center gap-1.5 opacity-0 group-hover/event:opacity-100 transition-opacity ml-2">
                                                                                <div className="flex flex-col gap-px">
                                                                                    <button onClick={() => {
                                                                                        const firstIdx = eventNode.rows[0]?.originalIndex
                                                                                        if (firstIdx !== undefined) moveEvent(firstIdx, 'up')
                                                                                    }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Event Omhoog"><ArrowUp className="w-2.5 h-2.5" /></button>
                                                                                    <button onClick={() => {
                                                                                        const firstIdx = eventNode.rows[0]?.originalIndex
                                                                                        if (firstIdx !== undefined) moveEvent(firstIdx, 'down')
                                                                                    }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Event Omlaag"><ArrowDown className="w-2.5 h-2.5" /></button>
                                                                                </div>
                                                                                <div className="w-px h-6 bg-white/10" />
                                                                                <div className="flex flex-col gap-px">
                                                                                    <button onClick={() => {
                                                                                        const firstIdx = eventNode.rows[0]?.originalIndex
                                                                                        if (firstIdx !== undefined) insertEvent(firstIdx, 'before')
                                                                                    }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Event In (Voor)"><Plus className="w-2.5 h-2.5" /></button>
                                                                                    <button onClick={() => {
                                                                                        const lastIdx = eventNode.rows[eventNode.rows.length - 1]?.originalIndex
                                                                                        if (lastIdx !== undefined) insertEvent(lastIdx, 'after')
                                                                                    }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Event In (Na)"><Plus className="w-2.5 h-2.5" /></button>
                                                                                </div>
                                                                                <div className="w-px h-6 bg-white/10" />
                                                                                <button onClick={() => {
                                                                                    openModal({
                                                                                        title: 'Groep Verwijderen',
                                                                                        message: `Weet je zeker dat je groep ${act.id} - ${scene.id}.${eventNode.id} wilt verwijderen?`,
                                                                                        type: 'confirm',
                                                                                        onConfirm: () => deleteGroup(act.id, scene.id, eventNode.id)
                                                                                    })
                                                                                }} className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500" title="Verwijder Event"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Actual Grid Rows */}
                                                                <div className="flex flex-col">
                                                                    {titleRow && !eventCollapsed && <RowItem
                                                                        key={`row-title-${titleRow.originalIndex}`}
                                                                        event={titleRow.event}
                                                                        originalIndex={titleRow.originalIndex}
                                                                        isNextGroup={eventNode.isNext}
                                                                        isActiveGroup={eventNode.isActive}
                                                                        handleRowClick={handleRowClick}
                                                                        handleRowDoubleClick={handleRowDoubleClick}
                                                                        editingIndex={editingIndex}
                                                                        setEditingIndex={setEditingIndex}
                                                                        menuOpenIndex={menuOpenIndex}
                                                                        setMenuOpenIndex={setMenuOpenIndex}
                                                                        activeShow={activeShow}
                                                                        isLocked={isLocked}
                                                                        activeEventIndex={activeEventIndex}
                                                                        eventStatuses={eventStatuses}
                                                                        selectedEventIndex={selectedEventIndex}
                                                                        selectedEvent={selectedEvent}
                                                                        ongoingEffects={eventNode.ongoingEffects}
                                                                    />}

                                                                    {(() => {
                                                                        const usedFixtures = eventNode.rows.map(r => r.event.fixture).filter(Boolean)
                                                                        return otherRows.map(item => {
                                                                            const isAction = item.event.type?.toLowerCase() === 'action'
                                                                            const isTrigger = item.event.type?.toLowerCase() === 'trigger'

                                                                            // User requested: Always show triggers when collapsed, 
                                                                            // but HIDE if it's a manual trigger without a cue (text)
                                                                            if (eventCollapsed) {
                                                                                if (isAction) { /* continue */ }
                                                                                else if (isTrigger) {
                                                                                    const isManual = (item.event.effect || 'manual').toLowerCase() === 'manual';
                                                                                    if (isManual && !item.event.cue) return null;
                                                                                }
                                                                                else return null;
                                                                            }

                                                                            return (
                                                                                <RowItem
                                                                                    key={`row-${item.originalIndex}`}
                                                                                    event={{ ...item.event, usedFixtures } as any}
                                                                                    originalIndex={item.originalIndex}
                                                                                    isNextGroup={eventNode.isNext}
                                                                                    isActiveGroup={eventNode.isActive}
                                                                                    handleRowClick={handleRowClick}
                                                                                    handleRowDoubleClick={handleRowDoubleClick}
                                                                                    editingIndex={editingIndex}
                                                                                    setEditingIndex={setEditingIndex}
                                                                                    menuOpenIndex={menuOpenIndex}
                                                                                    setMenuOpenIndex={setMenuOpenIndex}
                                                                                    activeShow={activeShow}
                                                                                    isLocked={isLocked}
                                                                                    activeEventIndex={activeEventIndex}
                                                                                    eventStatuses={eventStatuses}
                                                                                    selectedEventIndex={selectedEventIndex}
                                                                                    selectedEvent={selectedEvent}
                                                                                    ongoingEffects={eventNode.ongoingEffects}
                                                                                />
                                                                            )
                                                                        })
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default SequenceGrid
