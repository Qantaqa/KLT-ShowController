import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, Play, Square, Volume2, VolumeX, Repeat, Sun, MoreVertical, Edit2, Copy, ClipboardPaste, Send, Plus, Trash2, ArrowUp, ArrowDown, PlusSquare, Info, Clock, SkipForward, Zap, Monitor, Loader2, Check, AlertCircle, Type, User, MousePointer2, Lightbulb, Pipette, MessageSquare, FolderOpen, Layers, ListOrdered, ClipboardCheck } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { Device } from '../types/devices'
import type { ShowEvent, ClipboardItem } from '../types/show'
import { cn } from '../lib/utils'
import { ShowCheckPanel } from './ShowCheckPanel'
import { runShowChecks, type ShowCheckIssue } from '../utils/showChecks'

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

    const appSettings = useSequencerStore(s => s.appSettings)
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
                                    <div className="fixed hidden group-hover/prev-eff:block z-[250] pointer-events-none p-1 bg-[#111] border border-white/20 rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200 effect-preview-box">
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
                                    <div className="fixed hidden group-hover/prev-pal:block z-[250] pointer-events-none p-1 bg-[#111] border border-white/20 rounded shadow-2xl animate-in fade-in zoom-in-95 duration-200 palette-preview-box">
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
        <div
            className="absolute inset-0 pointer-events-none p-0.5 videowall-preview-overlay"
            ref={el => {
                if (el) {
                    el.style.setProperty('--cols', cols.toString());
                    el.style.setProperty('--rows', rows.toString());
                    el.style.setProperty('--gap', `${bezelSize / 2}px`);
                }
            }}
        >
            {Array.from({ length: cols * rows }).map((_, i) => (
                <div key={i} className="border border-white/40 ring-1 ring-black/50" />
            ))}
        </div>
    );
};

// Transition strip rendered BETWEEN event cards (replaces trigger rows in the card body)
// Note: trigger rows are excluded from the card body, so editing must be handled from here.
const EventTransition: React.FC<{
    triggerEvent: ShowEvent | null
    isLastEvent: boolean
    isLocked: boolean
    onEditTrigger?: (index?: number) => void
    triggerIndex?: number
}> = ({ triggerEvent, isLastEvent, isLocked, onEditTrigger, triggerIndex }) => {
    if (!triggerEvent && isLastEvent) return null

    const triggerType = (triggerEvent?.effect || 'manual').toLowerCase()
    const cueText = triggerEvent?.cue || ''
    const isManualNoCue = !triggerEvent || (triggerType === 'manual' && !cueText)

    const canEdit = !isLocked && !!onEditTrigger

    const editHint = canEdit ? (
        <button
            onClick={(e) => { e.stopPropagation(); if (canEdit) onEditTrigger?.(triggerIndex) }}
            className="opacity-0 group-hover/trans:opacity-60 hover:!opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded"
            title="Overgang bewerken"
        >
            <Edit2 className="w-2.5 h-2.5" />
        </button>
    ) : null

    if (isManualNoCue) {
        // If there is no explicit trigger row, still show a normal "manual transition" strip.
        // This keeps the UI consistent and still allows editing/creating the transition.
        const label = cueText || 'Handmatige overgang'
        return (
            <div
                className={cn("flex items-center gap-2 px-4 py-1 group/trans", canEdit && "cursor-pointer")}
                onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
            >
                <div className="flex-1 border-t border-yellow-500/40" />
                <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/15 border border-yellow-500/50 rounded text-[10px] text-yellow-200 font-bold max-w-[400px] group-hover/trans:bg-yellow-500/25 transition-colors">
                    <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                    <span className="truncate">{label}</span>
                    {editHint}
                </div>
                <div className="flex-1 border-t border-yellow-500/40" />
            </div>
        )
    }

    if (triggerType === 'timed') {
        const duration = triggerEvent?.duration || 0
        const mins = Math.floor(duration / 60)
        const secs = (duration % 60).toString().padStart(2, '0')
        return (
            <div
                className={cn("flex items-center gap-2 px-4 py-1 group/trans", canEdit && "cursor-pointer")}
                onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
            >
                <div className="flex-1 border-t border-dashed border-yellow-500/30" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-[9px] text-yellow-300 font-bold group-hover/trans:bg-yellow-500/20 transition-colors">
                    <Clock className="w-3 h-3" />
                    <span>Automatisch na {mins}:{secs}</span>
                    {editHint}
                </div>
                <div className="flex-1 border-t border-dashed border-yellow-500/30" />
            </div>
        )
    }

    if (triggerType === 'media') {
        const mediaName = triggerEvent?.mediaTriggerId
            ? triggerEvent.mediaTriggerId.split('|')[0]?.split(/[/\\]/).pop() || 'media'
            : 'media afgerond'
        return (
            <div
                className={cn("flex items-center gap-2 px-4 py-1 group/trans", canEdit && "cursor-pointer")}
                onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
            >
                <div className="flex-1 border-t border-dashed border-blue-500/30" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] text-blue-300 font-bold group-hover/trans:bg-blue-500/20 transition-colors">
                    <SkipForward className="w-3 h-3" />
                    <span>Na: {mediaName}</span>
                    {editHint}
                </div>
                <div className="flex-1 border-t border-dashed border-blue-500/30" />
            </div>
        )
    }

    // Manual WITH cue text — prominent yellow cue block
    return (
        <div
            className={cn("flex items-center gap-2 px-4 py-1 group/trans", canEdit && "cursor-pointer")}
            onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
        >
            <div className="flex-1 border-t border-yellow-500/40" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/15 border border-yellow-500/50 rounded text-[10px] text-yellow-200 font-bold max-w-[400px] group-hover/trans:bg-yellow-500/25 transition-colors">
                <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                <span className="truncate">{cueText}</span>
                {editHint}
            </div>
            <div className="flex-1 border-t border-yellow-500/40" />
        </div>
    )
}

const TransitionEditModal: React.FC<{
    triggerIndex: number
    onClose: () => void
}> = ({ triggerIndex, onClose }) => {
    const updateEvent = useSequencerStore(s => s.updateEvent)
    const events = useSequencerStore(s => s.events)

    const trigger = events[triggerIndex]
    const siblingMedia = useMemo(() => {
        if (!trigger) return []
        return events.filter(e =>
            e.act === trigger.act &&
            e.sceneId === trigger.sceneId &&
            e.eventId === trigger.eventId &&
            e.type?.toLowerCase() === 'media'
        )
    }, [events, trigger])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    if (!trigger) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <button
                className="absolute inset-0 bg-black/70"
                onClick={onClose}
                aria-label="Sluiten"
            />
            <div className="relative w-[min(720px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_30px_80px_rgba(0,0,0,0.6)] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <MousePointer2 className="w-4 h-4 text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Overgang bewerken</span>
                            <span className="text-[9px] font-mono text-white/40">{trigger.act} • {trigger.sceneId}.{trigger.eventId}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] opacity-50 w-24 shrink-0">Type</span>
                        <select
                            title="Trigger type"
                            className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                            value={trigger.effect || 'manual'}
                            onChange={(e) => updateEvent(triggerIndex, { effect: e.target.value })}
                        >
                            <option value="manual">Handmatige overgang</option>
                            <option value="timed">Timed (Auto-trigger)</option>
                            <option value="media">Media afgerond trigger</option>
                        </select>
                    </div>

                    {(trigger.effect || 'manual').toLowerCase() === 'manual' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] opacity-50 w-24 shrink-0">Cue</span>
                            <RenamableInput
                                autoFocus
                                className="flex-1 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none focus:bg-white/20"
                                value={trigger.cue || ''}
                                placeholder="Trigger zin / actie..."
                                onRename={(val) => updateEvent(triggerIndex, { cue: val })}
                            />
                        </div>
                    )}

                    {(trigger.effect || '').toLowerCase() === 'timed' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] opacity-50 w-24 shrink-0">Vertraging</span>
                            <RenamableInput
                                autoFocus
                                className="w-24 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none text-center font-mono"
                                placeholder="MM:SS"
                                value={(trigger.duration ? Math.floor(trigger.duration / 60) + ':' + (trigger.duration % 60).toString().padStart(2, '0') : '0:00')}
                                onRename={(val) => {
                                    const parts = val.split(':')
                                    const m = parseInt(parts[0]) || 0
                                    const s = parseInt(parts[1]) || 0
                                    updateEvent(triggerIndex, { duration: (m * 60) + s })
                                }}
                            />
                        </div>
                    )}

                    {(trigger.effect || '').toLowerCase() === 'media' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] opacity-50 w-24 shrink-0">Media</span>
                            {siblingMedia.length > 0 ? (
                                <select
                                    title="Selecteer Media Trigger"
                                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-blue-300 outline-none"
                                    value={trigger.mediaTriggerId || ''}
                                    onChange={(e) => updateEvent(triggerIndex, { mediaTriggerId: e.target.value })}
                                >
                                    <option value="">Wacht op een media in dit event...</option>
                                    {siblingMedia.map((m, idx) => {
                                        const mediaId = `${m.filename}|${m.fixture}`
                                        const name = m.filename?.split(/[\\/]/).pop() || 'Onbekende media'
                                        return (
                                            <option key={idx} value={mediaId}>
                                                {name} {m.fixture ? `(${m.fixture})` : ''}
                                            </option>
                                        )
                                    })}
                                </select>
                            ) : (
                                <div className="flex-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> Geen media gevonden in dit event
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-white border border-primary/30 text-black text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
                    >
                        Opslaan &amp; sluiten
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}


const RowItem: React.FC<{
    event: ShowEvent
    originalIndex: number
    id: number | string
    isShadow?: boolean
    zebraIndex?: number
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
    event, originalIndex, id, isShadow, isActiveGroup, isNextGroup, handleRowClick, handleRowDoubleClick,
    editingIndex, setEditingIndex, menuOpenIndex, setMenuOpenIndex, isLocked,
    activeEventIndex, eventStatuses, ongoingEffects, zebraIndex
}) => {
        const [currentTime, setCurrentTime] = useState(new Date())
        const menuButtonRef = useRef<HTMLButtonElement>(null)

        useEffect(() => {
            const t = setInterval(() => setCurrentTime(new Date()), 1000)
            return () => clearInterval(t)
        }, [])

        const isTimeTracking = useSequencerStore(s => s.isTimeTracking)
        const lastTransitionTime = useSequencerStore(s => s.lastTransitionTime)
        const events = useSequencerStore(s => s.events)

        // Actions
        const updateEvent = useSequencerStore(s => s.updateEvent)
        const deleteEvent = useSequencerStore(s => s.deleteEvent)
        const addToast = useSequencerStore(s => s.addToast)
        const resendEvent = useSequencerStore(s => s.resendEvent)
        const renameAct = useSequencerStore(s => s.renameAct)
        const renameScene = useSequencerStore(s => s.renameScene)
        const moveAct = useSequencerStore(s => s.moveAct)
        const moveScene = useSequencerStore(s => s.moveScene)
        const moveEvent = useSequencerStore(s => s.moveEvent)
        const insertAct = useSequencerStore(s => s.insertAct)
        const insertScene = useSequencerStore(s => s.insertScene)
        const insertEvent = useSequencerStore(s => s.insertEvent)
        const addEventAbove = useSequencerStore(s => s.addEventAbove)
        const addEventBelow = useSequencerStore(s => s.addEventBelow)
        const restartMedia = useSequencerStore(s => s.restartMedia)
        const stopMedia = useSequencerStore(s => s.stopMedia)
        const toggleAudio = useSequencerStore(s => s.toggleAudio)
        const toggleRepeat = useSequencerStore(s => s.toggleRepeat)
        const setMediaBrightness = useSequencerStore(s => s.setMediaBrightness)
        const setMediaVolume = useSequencerStore(s => s.setMediaVolume)
        const copyToClipboard = useSequencerStore(s => s.copyToClipboard)
        const loadClipboard = useSequencerStore(s => s.loadClipboard)
        const clipboard = useSequencerStore(s => s.clipboard)
        const openModal = useSequencerStore(s => s.openModal)
        const pasteEvent = useSequencerStore(s => s.pasteEvent)
        const addCommentToEvent = useSequencerStore(s => s.addCommentToEvent)

        const pasteFromClipboard = (item: ClipboardItem, target: ShowEvent) => {
            if (isLocked) return

            const copiedEvent = { ...item.data }

            // Find group events to check for fixture conflict
            const events = useSequencerStore.getState().events
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
                addToast('De header (Title) van een event kan niet worden verwijderd.', 'warning');
                setMenuOpenIndex(null);
                return;
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
        const type = event.type?.toLowerCase() || ''
        const status = eventStatuses[originalIndex]
        const videoRef = useRef<HTMLVideoElement>(null)

        const appSettings = useSequencerStore(s => s.appSettings)
        const serverIp = appSettings.serverIp || window.location.hostname;
        const SOCKET_PORT = appSettings.serverPort || 3001;
        const FILE_PORT = SOCKET_PORT + 1;

        const getMediaUrlWithContext = (path: string) => {
            if (!path) return '';
            if (path.startsWith('http') || path.startsWith('ledshow-file')) return path;
            return `http://${serverIp}:${FILE_PORT}/media?path=${encodeURIComponent(path)}`;
        };

        const getDevices = useCallback(() => appSettings.devices || [], [appSettings.devices])

        const siblingMedia = useMemo(() => {
            return events.filter(e =>
                e.act === event.act &&
                e.sceneId === event.sceneId &&
                e.eventId === event.eventId &&
                e.type?.toLowerCase() === 'media'
            );
        }, [events, event.act, event.sceneId, event.eventId]);

        const playingMedia = useSequencerStore(s => s.playingMedia)
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

        const isDefaultComment = type === 'comment' && (
            !event.cue ||
            event.cue === 'Nieuw commentaar' ||
            event.cue === 'Opmerkingen' ||
            event.cue === 'Opmerking'
        );
        // Hide placeholder/empty comment rows unless the user is actively editing that row.
        if (type === 'comment' && isDefaultComment && editingIndex !== originalIndex) return null;

        const zebraClass = !isShadow && zebraIndex !== undefined
            ? (zebraIndex % 2 === 0 ? "bg-white/[0.04]" : "bg-white/[0.08]")
            : null

        return (
            <div
                data-row-id={id}
                onClick={() => !isShadow && handleRowClick(originalIndex)}
                onDoubleClick={() => !isShadow && handleRowDoubleClick(originalIndex)}
                className={cn(
                    "group/row relative flex items-center px-4 py-2 transition-all border-l-2",
                    isShadow ? "cursor-default opacity-50 grayscale bg-white/5 border-l-dashed border-l-primary/30" : "cursor-pointer",
                    !isShadow && zebraClass,
                    isRowActive ? "bg-green-500/20 border-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]" : "border-transparent hover:bg-white/5",
                    isActiveGroup && !isRowActive && "border-l-green-500/30",
                    isNextGroup && !isRowActive && "border-l-orange-500/30",
                    type === 'comment' && "opacity-60 italic text-[11px]",
                    type === 'action' && "border-l-yellow-500 text-yellow-100",
                    type === 'light' && "border-l-purple-500/50",
                    type === 'media' && "border-l-blue-500/40",
                    type === 'trigger' && "opacity-40 text-[10px] font-mono",
                    isShadow && "shadow-none hover:bg-white/5"
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
                                            <div className="flex-1 flex gap-2">
                                                {siblingMedia.length > 0 ? (
                                                    <select
                                                        title="Selecteer Media Trigger"
                                                        className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-blue-400 outline-none"
                                                        value={event.mediaTriggerId || ''}
                                                        onChange={(e) => updateEvent(originalIndex, { mediaTriggerId: e.target.value })}
                                                    >
                                                        <option value="">Wacht op een media in dit event...</option>
                                                        {siblingMedia.map((m, idx) => {
                                                            const mediaId = `${m.filename}|${m.fixture}`;
                                                            const name = m.filename?.split(/[\\/]/).pop() || 'Onbekende media';
                                                            return (
                                                                <option key={idx} value={mediaId}>
                                                                    {name} {m.fixture ? `(${m.fixture})` : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                ) : (
                                                    <div className="flex-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-center gap-2">
                                                        <AlertCircle className="w-3 h-3" /> Geen media gevonden in dit event
                                                    </div>
                                                )}
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
                                                    (d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent') &&
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

                                    {type === 'media' && event.fixture && (() => {
                                        const device = getDevices().find(d => d.name === event.fixture)
                                        if (device?.type === 'local_monitor' && device.projectionMasks && device.projectionMasks.length > 0) {
                                            return (
                                                <div className="flex flex-col gap-1.5 p-2 bg-primary/5 border border-primary/10 rounded mt-1">
                                                    <span className="text-[9px] opacity-40 uppercase font-black tracking-widest">Projection Masks:</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {device.projectionMasks.map(mask => (
                                                            <label key={mask.id} className="flex items-center gap-1.5 cursor-pointer group/mask">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-3 h-3 rounded border border-white/20 bg-black/40 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                                                    checked={event.projectionMaskIds?.includes(mask.id)}
                                                                    onChange={(e) => {
                                                                        const current = event.projectionMaskIds || []
                                                                        const next = e.target.checked
                                                                            ? [...current, mask.id]
                                                                            : current.filter(id => id !== mask.id)
                                                                        updateEvent(originalIndex, { projectionMaskIds: next })
                                                                    }}
                                                                />
                                                                <span className="text-[10px] text-white/60 group-hover/mask:text-white transition-colors">
                                                                    {mask.name || (mask.id.length > 8 ? `${mask.id.slice(0, 8)}...` : mask.id)}
                                                                </span>
                                                            </label>
                                                        ))}
                                                        {(!event.projectionMaskIds || event.projectionMaskIds.length === 0) && (
                                                            <span className="text-[10px] italic text-white/30">Alle maskers actief</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    })()}

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
                                                        // Stop marker is stored on the *media/light row* as:
                                                        //   stopAct + stopSceneId + stopEventId
                                                        // At runtime (Show/locked mode) the host calls `stopMediaAt(act, sceneId, eventId)`
                                                        // when ENTERING a new event group; that function matches those stop markers and
                                                        // triggers a fade-out stop on the actual device (local monitor / remote / agent).
                                                        value={(() => {
                                                            const stopAct = (event.stopAct || '').trim()
                                                            const stopScene = Number.parseInt(String(event.stopSceneId ?? ''), 10)
                                                            const stopEvent = Number.parseInt(String(event.stopEventId ?? ''), 10)
                                                            const computed =
                                                                stopAct && Number.isFinite(stopScene) && stopScene > 0 && Number.isFinite(stopEvent) && stopEvent > 0
                                                                    ? `${stopAct}|${stopScene}|${stopEvent}`
                                                                    : ''

                                                            return computed
                                                        })()}
                                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                            const val = e.target.value
                                                            if (!val) {
                                                                updateEvent(originalIndex, {
                                                                    stopAct: undefined,
                                                                    stopSceneId: undefined,
                                                                    stopEventId: undefined
                                                                } as any)
                                                            } else {
                                                                const [act, sId, eId] = val.split('|')
                                                                const parsedSceneId = Number.parseInt(sId, 10)
                                                                const parsedEventId = Number.parseInt(eId, 10)
                                                                updateEvent(originalIndex, {
                                                                    stopAct: act?.trim() || undefined,
                                                                    stopSceneId: Number.isFinite(parsedSceneId) ? parsedSceneId : undefined,
                                                                    stopEventId: Number.isFinite(parsedEventId) ? parsedEventId : undefined
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        <option value="">— Geen stop moment —</option>
                                                        {events
                                                            .filter((e: ShowEvent, idx: number) => e.type?.toLowerCase() === 'title' && idx > originalIndex)
                                                            .map((titleEvt: ShowEvent, idx: number) => (
                                                                <option key={idx} value={`${titleEvt.act}|${titleEvt.sceneId}|${titleEvt.eventId}`}>
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
                                                    {(() => {
                                                        if (!event.mediaTriggerId) return <span>Overgang als een media is afgerond</span>;
                                                        const [filename] = event.mediaTriggerId.split('|');
                                                        const name = filename?.split(/[\\/]/).pop() || 'Onbekende media';
                                                        return <span>Overgang als "{name}" is afgerond</span>;
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-primary">
                                                    <Zap className="w-3.5 h-3.5" />
                                                    <span>Handmatige overgang ({event.cue || 'Geen cue'})</span>
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
                                                    WIZ <span className="opacity-50">|</span> <span className="w-2 h-2 rounded-full inline-block color-indicator" ref={el => el?.style.setProperty('--bg-color', event.color1 || '#ffffff')}></span> <span className="opacity-50">|</span> Bri: {event.brightness}
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
                            {(type !== 'media' && type !== 'action' && event.fixture) && (type !== 'title' && type !== 'comment') && <div className="text-[10px] opacity-40 truncate">{event.fixture} {event.effect ? `• ${event.effect}` : ''}</div>}
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
                                {(() => {
                                    const targetDev = event.fixture ? getDevices().find(d => d.name === event.fixture) : null;
                                    const isVideoWall = targetDev?.type === 'videowall_agent' || targetDev?.type === 'remote_VideoWall' || targetDev?.type === 'local_monitor';

                                    if (!isVideoWall) return null;

                                    return (
                                        <>
                                            <div className="flex items-center gap-1.5 bg-white/5 rounded p-0.5" title="Brightness">
                                                <Sun className="w-3 h-3 opacity-40 mx-0.5" />
                                                <button onClick={(e) => { e.stopPropagation(); setMediaBrightness(originalIndex, Math.max(0, (event.brightness !== undefined ? event.brightness : 100) - 10)); }} className="p-1 hover:bg-white/10 rounded w-5 h-5 flex items-center justify-center text-white/60 hover:text-white">-</button>
                                                <span className="text-[10px] w-6 text-center tabular-nums font-mono opacity-60">{event.brightness !== undefined ? event.brightness : 100}%</span>
                                                <button onClick={(e) => { e.stopPropagation(); setMediaBrightness(originalIndex, Math.min(200, (event.brightness !== undefined ? event.brightness : 100) + 10)); }} className="p-1 hover:bg-white/10 rounded w-5 h-5 flex items-center justify-center text-white/60 hover:text-white">+</button>
                                            </div>
                                            <div className="w-px h-6 bg-white/10 mx-2" />
                                        </>
                                    );
                                })()}
                                <button onClick={(e) => { e.stopPropagation(); toggleRepeat(originalIndex) }} className={cn("p-1.5 rounded transition-colors", event.effect === 'repeat' ? "bg-green-500/20 text-green-500" : "bg-white/10 text-white/40")} title="Repeat"><Repeat className="w-3.5 h-3.5" /></button>
                                {/* Transfer Progress (Sync) */}
                                {(() => {
                                    const activeTransfers = useSequencerStore.getState().activeTransfers;
                                    const targetDev = event.fixture ? getDevices().find(d => d.name === event.fixture) : null;
                                    if (!targetDev) return null;
                                    const transfer = Object.values(activeTransfers).find(t => t.deviceId === targetDev.id);
                                    if (!transfer) return null;
                                    const statusLabel = transfer.status === 'checking' ? '⏳' : transfer.status === 'uploading' ? `⬆ ${transfer.percent}%` : transfer.status === 'complete' ? '✅' : transfer.status === 'skipped' ? '✓' : '❌';
                                    return (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-bold text-amber-300">
                                            {statusLabel}
                                        </div>
                                    );
                                })()}
                            </div>
                            {event.filename && (() => {
                                const isPortrait = event.fixture && getDevices().find(d => d.name === event.fixture)?.type === 'videowall_agent' && (getDevices().find(d => d.name === event.fixture) as any)?.orientation === 'portrait';
                                return (
                                    <div className={cn(
                                        "w-32 bg-black rounded border border-white/10 overflow-hidden relative group/preview",
                                        isPortrait ? "aspect-[9/16]" : "aspect-video"
                                    )}>
                                        <div className={cn(
                                            "absolute",
                                            isPortrait ? "top-1/2 left-1/2" : "inset-0"
                                        )} style={isPortrait ? { width: '177.77%', height: '56.25%', transform: 'translate(-50%, -50%) rotate(-90deg)' } : {}}>
                                            <video
                                                ref={videoRef}
                                                src={getMediaUrlWithContext(event.filename)}
                                                className="w-full h-full object-cover"
                                                muted
                                                onTimeUpdate={(e) => {
                                                    const v = e.currentTarget;
                                                    if (v.duration) {
                                                        const progress = (v.currentTime / v.duration) * 100;
                                                        const bar = v.closest('.group\\/preview')?.querySelector('.video-progress-bar') as HTMLElement;
                                                        if (bar) bar.style.width = `${progress}%`;
                                                        setVideoTimes({ current: Math.floor(v.currentTime), total: Math.floor(v.duration) });
                                                    }
                                                }}
                                                onLoadedMetadata={(e) => {
                                                    const v = e.currentTarget;
                                                    setVideoTimes({ current: 0, total: Math.floor(v.duration) });
                                                }}
                                            />
                                        </div>
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
                                            <div
                                                className="video-progress-bar h-full bg-primary transition-[width] duration-300 ease-linear progress-bar-fill"
                                                ref={el => el?.style.setProperty('--percent', '0%')}
                                            />
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>

                {
                    (type === 'light' || type === 'media') && status && (
                        <div className="flex-shrink-0 px-2 flex items-center gap-1.5 overflow-hidden">
                            {status === 'sending' && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-400 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Sending</div>}
                            {status === 'ok' && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-green-400"><Check className="w-3 h-3" /> OK</div>}
                            {status === 'failed' && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500"><AlertCircle className="w-3 h-3" /> Failed</div>}
                        </div>
                    )
                }

                <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    {editingIndex === originalIndex || isShadow ? null : (
                        <div className="relative">
                            {!isLocked || (type === 'light' || type === 'media') ? (
                                <button
                                    ref={menuButtonRef}
                                    onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === originalIndex ? null : originalIndex) }}
                                    title="Context Menu"
                                    className="p-1 hover:bg-white/10 rounded"
                                >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                            ) : null}
                            {menuOpenIndex === originalIndex && (
                                <ContextMenu
                                    index={originalIndex}
                                    event={event}
                                    type={type}
                                    isLocked={isLocked}
                                    onClose={() => setMenuOpenIndex(null)}
                                    anchorRect={menuButtonRef.current?.getBoundingClientRect() || undefined}
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
            </div >
        )
    }



// Context menu for Acts and Scenes (currently unused; kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const openModal = useSequencerStore(s => s.openModal)

    if (!anchorRect) return null

    const menuContent = (
        <div
            ref={el => {
                if (el && anchorRect) {
                    el.style.setProperty('--menu-top', `${anchorRect.bottom + 4}px`);
                    el.style.setProperty('--menu-left', `${anchorRect.right - 208}px`);
                }
                if (menuRef) (menuRef as any).current = el;
            }}
            className="fixed w-52 glass border border-white/10 rounded-lg shadow-2xl py-1 z-[9999] context-menu-container"
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
                        const lastEventNode = scene.events[scene.events.length - 1]
                        const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                        if (lastRow) handlers.insertEvent(lastRow.originalIndex, 'after');
                        onClose();
                    }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
                        <PlusSquare className="w-3 h-3 text-blue-400" /> Event toevoegen
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

// Keep symbol referenced to avoid TS unused warning (menu is currently not wired).
void HeaderContextMenu

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
            ref={el => {
                if (el && anchorRect) {
                    el.style.setProperty('--menu-top', `${isFlipped ? (anchorRect.top - Math.round(el.offsetHeight) - 4) : (anchorRect.bottom + 4)}px`);
                    el.style.setProperty('--menu-left', `${anchorRect.right - 208}px`);
                }
                if (menuRef) (menuRef as any).current = el;
            }}
            className={cn(
                "fixed w-52 glass border border-white/10 rounded-lg shadow-2xl py-1 z-[9999] overflow-visible context-menu-container",
            )}
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
                <button onClick={(e) => { e.stopPropagation(); handlers.resendEvent(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-blue-400">
                    <Send className="w-3 h-3" /> Herzenden
                </button>
            )}


            {!isLocked && (
                <>
                    <div className="h-px bg-white/5 my-1" />

                    {/* Event Level Actions */}
                    {type === 'title' && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); handlers.addCommentToEvent(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
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
                                <button onClick={(e) => { e.stopPropagation(); handlers.addEventBelow(index, 'Action', 'Aktie'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><User className="w-3 h-3 text-blue-400" /> Aktie </button>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    const s = useSequencerStore.getState();
                                    const sceneId = event.sceneId ?? 0;
                                    const eventId = event.eventId ?? 0;
                                    const groupId = `${event.act}-${sceneId}-${eventId}`;
                                    const collapsed = s.isLocked ? (s.runtimeCollapsedGroups || {}) : (s.activeShow?.viewState?.collapsedGroups || {});
                                    if (collapsed[groupId]) s.toggleCollapse(groupId);
                                    handlers.addEventBelow(index, 'Light', 'Licht');
                                    onClose();
                                }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Lightbulb className="w-3 h-3 text-yellow-400" /> Licht </button>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    const s = useSequencerStore.getState();
                                    const sceneId = event.sceneId ?? 0;
                                    const eventId = event.eventId ?? 0;
                                    const groupId = `${event.act}-${sceneId}-${eventId}`;
                                    const collapsed = s.isLocked ? (s.runtimeCollapsedGroups || {}) : (s.activeShow?.viewState?.collapsedGroups || {});
                                    if (collapsed[groupId]) s.toggleCollapse(groupId);
                                    handlers.addEventBelow(index, 'Media', 'Media');
                                    onClose();
                                }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Layers className="w-3 h-3 text-purple-400" /> Media </button>
                                {!useSequencerStore.getState().events.some(e => e.act === event.act && e.sceneId === event.sceneId && e.eventId === event.eventId && e.type?.toLowerCase() === 'trigger') && (
                                    <button onClick={(e) => { e.stopPropagation(); handlers.addEventBelow(index, 'Trigger', 'Handmatige overgang'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><MousePointer2 className="w-3 h-3 text-primary" /> Trigger </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-white/5 my-1" />

                    <button onClick={(e) => { e.stopPropagation(); handlers.handleDelete(index, event); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-red-500">
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
        activeShow,
        isLocked,
        setActiveEvent,
        toggleCollapse,
        openModal,
        deleteAct,
        deleteScene,
        runtimeCollapsedGroups,
        eventStatuses,
    } = useSequencerStore() as any

    const selectedEventIndex = useSequencerStore(s => s.selectedEventIndex)
    const setSelectedEvent = useSequencerStore(s => s.setSelectedEvent)
    const selectedEvent = events[selectedEventIndex] || null;

    const lastTransitionTime = useSequencerStore(s => s.lastTransitionTime)
    const isPaused = useSequencerStore(s => s.isPaused)
    const pauseStartTime = useSequencerStore(s => s.pauseStartTime)

    // Actions
    const deleteGroup = useSequencerStore(s => s.deleteGroup)
    const renameAct = useSequencerStore(s => s.renameAct)
    const renameScene = useSequencerStore(s => s.renameScene)
    const moveAct = useSequencerStore(s => s.moveAct)
    const moveScene = useSequencerStore(s => s.moveScene)
    const moveEvent = useSequencerStore(s => s.moveEvent)
    const insertAct = useSequencerStore(s => s.insertAct)
    const insertScene = useSequencerStore(s => s.insertScene)
    const insertEvent = useSequencerStore(s => s.insertEvent)
    const addActComment = useSequencerStore(s => s.addActComment)
    const addSceneComment = useSequencerStore(s => s.addSceneComment)


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

    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    // Ensure currentTime is available or use new Date if store doesn't provide it live (it does usually if subbed)
    // Actually useSequencerStore has `currentTime`? NO. App.tsx has `currentTime`.
    // SequenceGrid needs `currentTime`.
    // I should add `currentTime` to `useSequencerStore` or pass it?
    // `useSequencerStore` doesn't have `currentTime`.
    // But `SequenceGrid` uses `currentTime`. Where did it come from? 
    // In previous view_file, line 100+...
    // Let's check where `currentTime` came from in `SequenceGrid`.
    // It's likely using `new Date()` in an interval or prop?
    // In the view_file of SequenceGrid (line 1-100), I didn't see `currentTime` logic.
    // Line 122: `const [currentTime, setCurrentTime] = useState(new Date())` likely exists deeper?
    // Let's assume I need to add that state to SequenceGrid if it was removed or missing.
    // Or I should add it.










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
        id: number | string
        isShadow?: boolean
    }

    interface EventNode {
        id: number | undefined
        uniqueId: string
        rows: EventRow[]
        isActive: boolean
        isNext: boolean
        duration: number
        activeDuration: number
        isMinimal: boolean
        ongoingEffects?: { type: 'media' | 'light'; id: string }[]
    }

    interface SceneNode {
        id: number | undefined // sceneId
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
            // Act Node Vinden/Maken
            let act = acts.find(a => a.id === event.act)
            if (!act) {
                act = { id: event.act, scenes: [], isActive: false }
                acts.push(act)
            }

            // Act/Scene header rows are structural; they should not create "Event 0" groups.
            // They are rendered by the Act/Scene headers in the grid, not as event cards.
            const typeLower = (event.type || '').toLowerCase()
            if (typeLower === 'act') return

            // Als dit een puur Act-level item is (zoals Type 'Act' of een commentaar zonder sceneId),
            // kunnen we het niet opslaan in het *huidige* weergavemodel omdat dat model verwacht 
            // dat alles in een event zit. We pushen het als een speciale 'dummy' scene/event.
            let targetSceneId = event.sceneId
            let targetEventId = event.eventId

            // Scene header row: ensure scene exists but do not attach to an event node
            if (typeLower === 'scene') {
                const sceneId = targetSceneId ?? 0
                let scene = act.scenes.find(s => s.id === sceneId)
                if (!scene) {
                    scene = { id: sceneId, events: [], isActive: false }
                    act.scenes.push(scene)
                }
                return
            }

            if (targetSceneId === undefined) targetSceneId = 0 // Dummy ID for Act-level items (no scene)
            // Only use eventId=0 as dummy when there is no real eventId (Act-level items).
            // For real scenes, rows without an eventId are structural and are skipped above.
            if (targetEventId === undefined) targetEventId = 0 // Dummy ID for Act-level items

            let scene = act.scenes.find(s => s.id === targetSceneId)
            if (!scene) {
                scene = { id: targetSceneId, events: [], isActive: false }
                act.scenes.push(scene)
            }

            const uniqueId = `${event.act}-${targetSceneId}-${targetEventId}`
            let eventNode = scene.events.find(e => e.uniqueId === uniqueId)
            if (!eventNode) {
                eventNode = { id: targetEventId, uniqueId, rows: [], isActive: false, isNext: false, duration: 0, activeDuration: 0, isMinimal: false }
                scene.events.push(eventNode)
            }

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
                            const effId = `${evt.act}-${evt.sceneId}-${evt.eventId}-${row.id}`
                            n.ongoingEffects.push({
                                type: evt.type?.toLowerCase() as 'media' | 'light',
                                id: effId
                            })

                            // Add shadow row if not the source node
                            if (i > nodeIdx && !n.rows.some(r => r.originalIndex === row.originalIndex)) {
                                n.rows.push({
                                    event: evt,
                                    originalIndex: row.originalIndex,
                                    id: `shadow-${row.id}-${i}`,
                                    isShadow: true
                                })
                            }
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
                            if (t === 'action' || t === 'media' || t === 'light') return 3
                            if (t === 'trigger') return 6
                            return 99
                        }
                        const priorityA = getPriority(a.event.type)
                        const priorityB = getPriority(b.event.type)
                        if (priorityA !== priorityB) return priorityA - priorityB
                        return a.originalIndex - b.originalIndex
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

    const addEventBelow = useSequencerStore(s => s.addEventBelow)
    const deleteEvent = useSequencerStore(s => s.deleteEvent)
    const [transitionEditIndex, setTransitionEditIndex] = useState<number | null>(null)
    const [isCheckOpen, setIsCheckOpen] = useState(false)
    const [checkIssues, setCheckIssues] = useState<ShowCheckIssue[]>([])

    const openTransitionEditor = useCallback((idx: number) => {
        if (isLocked) return
        setSelectedEvent(idx)
        setTransitionEditIndex(idx)
    }, [isLocked, setSelectedEvent])

    const selectAndScrollToIndex = useCallback((idx: number) => {
        if (idx < 0) return
        useSequencerStore.getState().setSelectedEvent(idx)
        // Scroll to the specific row (data-row-id is the original index for real rows)
        const el = containerRef.current?.querySelector?.(`[data-row-id="${idx}"]`) as HTMLElement | null
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
            // Fallback: scroll to the container top
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [])

    const runCheck = useCallback(() => {
        const s = useSequencerStore.getState()
        const isHost = !!(window as any).require
        const issues = runShowChecks({
            events: s.events,
            devices: (s.appSettings?.devices || []) as any,
            activeShow: s.activeShow as any,
            isHost
        })
        setCheckIssues(issues)
        setIsCheckOpen(true)
    }, [])

    const fixCheckIssue = useCallback((issue: ShowCheckIssue) => {
        if (isLocked) return
        if (issue.originalIndex === undefined) return

        const s = useSequencerStore.getState()

        if (issue.type === 'missing_trigger') {
            const { act, sceneId, eventId } = issue
            if (!act || sceneId === undefined || eventId === undefined) return

            const existingTriggerIdx = s.events.findIndex(e =>
                e.act === act &&
                e.sceneId === sceneId &&
                e.eventId === eventId &&
                e.type?.toLowerCase() === 'trigger'
            )
            if (existingTriggerIdx !== -1) {
                s.addToast('Trigger bestaat al voor dit event', 'info')
                selectAndScrollToIndex(existingTriggerIdx)
                return
            }

            const titleIdx = s.events.findIndex(e =>
                e.act === act &&
                e.sceneId === sceneId &&
                e.eventId === eventId &&
                e.type?.toLowerCase() === 'title'
            )
            if (titleIdx === -1) return

            addEventBelow(titleIdx, 'Trigger', 'Handmatige overgang')
            s.addToast('Handmatige trigger toegevoegd', 'info')
            queueMicrotask(() => runCheck())
            return
        }

        if (issue.type === 'empty_default_comments') {
            const act = issue.act
            const sceneId = issue.sceneId
            const eventId = issue.eventId
            const idx = (() => {
                if (act && sceneId !== undefined && eventId !== undefined) {
                    const found = s.events.findIndex(e =>
                        e.act === act &&
                        (e.sceneId ?? 0) === (sceneId ?? 0) &&
                        (e.eventId ?? 0) === (eventId ?? 0) &&
                        (e.type || '').toLowerCase() === 'comment' &&
                        (((e.cue || '').trim() === '') || ['Nieuw commentaar', 'Opmerkingen', 'Opmerking'].includes((e.cue || '').trim()))
                    )
                    if (found !== -1) return found
                }
                return issue.originalIndex
            })()

            deleteEvent(idx)
            s.addToast('Lege commentaarregel verwijderd', 'info', 1000)
            setTimeout(() => runCheck(), 0)
        }
    }, [addEventBelow, deleteEvent, isLocked, runCheck, selectAndScrollToIndex])

    const ensureTriggerAndEdit = useCallback((eventNode: any, fallbackIndex?: number) => {
        if (isLocked) return

        const act = eventNode?.rows?.[0]?.event?.act
        const sceneId = eventNode?.rows?.[0]?.event?.sceneId
        const eventId = eventNode?.rows?.[0]?.event?.eventId

        const { events } = useSequencerStore.getState()
        const existing = events.findIndex(e =>
            e.act === act &&
            e.sceneId === sceneId &&
            e.eventId === eventId &&
            e.type?.toLowerCase() === 'trigger'
        )
        if (existing !== -1) {
            openTransitionEditor(existing)
            return
        }

        const baseIndex =
            typeof fallbackIndex === 'number'
                ? fallbackIndex
                : (eventNode?.rows?.find((r: any) => r?.event?.type?.toLowerCase() === 'title')?.originalIndex ?? eventNode?.rows?.[0]?.originalIndex)

        if (typeof baseIndex !== 'number') return

        addEventBelow(baseIndex, 'Trigger', 'Handmatige overgang')

        // After insertion + reindex, locate the newly created trigger row and open editor.
        queueMicrotask(() => {
            const { events: nextEvents } = useSequencerStore.getState()
            const idx = nextEvents.findIndex(e =>
                e.act === act &&
                e.sceneId === sceneId &&
                e.eventId === eventId &&
                e.type?.toLowerCase() === 'trigger'
            )
            if (idx !== -1) openTransitionEditor(idx)
        })
    }, [addEventBelow, isLocked, openTransitionEditor])







    return (
        <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-6 custom-scrollbar bg-black/20 scroll-smooth relative">
            {transitionEditIndex !== null && !isLocked && (
                <TransitionEditModal
                    triggerIndex={transitionEditIndex}
                    onClose={() => setTransitionEditIndex(null)}
                />
            )}
            <ShowCheckPanel
                open={isCheckOpen}
                issues={checkIssues}
                onClose={() => setIsCheckOpen(false)}
                onRescan={runCheck}
                onSelectIssue={(issue) => {
                    if (issue.originalIndex === undefined) return
                    selectAndScrollToIndex(issue.originalIndex)
                }}
                onFixIssue={fixCheckIssue}
            />
            {/* Time Tracking Toolbar removed (moved to App Header) */}
            {hierarchy.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40 italic text-sm">
                    Geen sequence data gevonden
                </div>
            )}

            {/* SHOW + EDIT: top-level "Show" header (single place for Open/Dicht/Hernummeren) */}
            {hierarchy.length > 0 && (
                <div className="relative group/show text-sm">
                    <div className="flex items-center justify-between bg-[#111] border-l-4 border-primary/70 px-4 py-2 shadow-lg hover:bg-[#1a1a1a] transition-colors rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="font-black text-primary uppercase tracking-widest shrink-0">Show</span>
                            <span className="text-white/80 font-bold truncate">
                                {activeShow?.name || <span className="opacity-30 italic">Naamloze show</span>}
                            </span>
                            <span className="text-[10px] font-mono opacity-30 shrink-0">
                                {activeEventIndex + 1} / {events.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 opacity-50 group-hover/show:opacity-100 transition-opacity">
                            {!isLocked && (
                                <button
                                    onClick={() => window.dispatchEvent(new Event('hub:open-project-settings'))}
                                    className="h-7 w-8 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center hover:bg-white/5 transition-all text-white"
                                    title="Show instellingen"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-primary" />
                                </button>
                            )}
                            <button
                                onClick={() => useSequencerStore.getState().expandAll()}
                                className="h-7 px-2.5 rounded-lg bg-black/40 border border-white/15 flex items-center gap-2 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-white"
                                title="Alles uitklappen"
                            >
                                <ChevronDown className="w-3.5 h-3.5 text-primary" />
                                Open
                            </button>
                            <button
                                onClick={() => useSequencerStore.getState().collapseAll()}
                                className="h-7 px-2.5 rounded-lg bg-black/40 border border-white/15 flex items-center gap-2 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-white"
                                title="Alles inklappen"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-primary" />
                                Dicht
                            </button>
                            <button
                                onClick={() => {
                                    useSequencerStore.getState().reindexEvents()
                                    useSequencerStore.getState().addToast('Sequence succesvol hernummerd', 'info')
                                }}
                                className="h-7 w-8 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center hover:bg-white/5 transition-all text-white"
                                title="Acts, Scenes en Events hernummeren"
                            >
                                <ListOrdered className="w-3.5 h-3.5 text-primary" />
                            </button>
                            <button
                                onClick={runCheck}
                                className="h-7 w-8 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center hover:bg-white/5 transition-all text-white"
                                title="Show check uitvoeren"
                            >
                                <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit-mode: no extra HUD/tools row needed */}


            {hierarchy.map((act, actIndex) => {
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
                                    <button onClick={() => {
                                        const firstEventIdx = act.scenes[0]?.events[0]?.rows[0]?.originalIndex ?? 0
                                        insertEvent(firstEventIdx, 'before')
                                    }} className="p-1.5 hover:bg-white/10 rounded flex items-center justify-center text-blue-400" title="Voeg Eerste Event Toe">
                                        <PlusSquare className="w-3.5 h-3.5" />
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); addActComment(act.id); }} className="p-1.5 hover:bg-white/10 rounded flex items-center justify-center text-white/50 hover:text-white" title="Voeg Commentaar Toe Aan Act">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </button>

                                    <button onClick={() => {
                                        openModal({
                                            title: 'Act Verwijderen',
                                            message: `Weet je zeker dat je Act "${act.id}" en alle inhoud wilt verwijderen?`,
                                            type: 'confirm',
                                            onConfirm: () => deleteAct(act.id)
                                        })
                                    }} className="p-1.5 hover:bg-red-500/20 rounded flex items-center justify-center text-red-500/50 hover:text-red-500" title="Verwijder Act">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {!actCollapsed && (
                            <div className="pl-4 space-y-4 border-l border-white/5 ml-2">
                                {act.scenes.map((scene, sceneIndex) => {
                                    const firstEvent = scene.events[0]?.rows[0]?.event
                                    const sceneDesc = activeShow?.viewState?.sceneNames?.[`${act.id}-${scene.id}`] || (firstEvent?.type?.toLowerCase() === 'title' ? firstEvent.cue : '') || ''

                                    // Dynamic Collapse
                                    const sceneCollapsed = collapsedGroups[`scene-${act.id}-${scene.id}`]

                                    return (
                                        <div key={scene.id} className="relative group/scene">
                                            {/* SCENE Header */}
                                            <div className={cn(
                                                "flex items-center justify-between mb-2 border-l-4 pl-3 py-0.5",
                                                scene.isActive ? "border-green-500/60" : "border-white/10"
                                            )}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleCollapse(`scene-${act.id}-${scene.id}`) }}
                                                        className="p-0.5 hover:bg-white/10 rounded shrink-0"
                                                    >
                                                        {sceneCollapsed ? <ChevronRight className="w-3 h-3 opacity-60" /> : <ChevronDown className="w-3 h-3 opacity-60" />}
                                                    </button>
                                                    {!isLocked ? (
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <RenamableInput
                                                                className="bg-transparent font-bold text-sm text-white/90 outline-none border-b border-transparent focus:border-white/30 flex-1 min-w-0"
                                                                placeholder="Scene omschrijving..."
                                                                value={sceneDesc}
                                                                onRename={(val) => renameScene(act.id, scene.id || 0, val)}
                                                            />
                                                            <span className="text-[9px] opacity-25 uppercase tracking-widest font-mono shrink-0">Scene {scene.id}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={cn(
                                                            "font-bold text-sm",
                                                            scene.isActive ? "text-green-300" : "text-white/80"
                                                        )}>
                                                            {sceneDesc || <span className="opacity-30 italic text-xs">Scene {scene.id}</span>}
                                                        </span>
                                                    )}
                                                    {scene.isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1 shrink-0" />}
                                                </div>

                                                {!isLocked && (
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover/scene:opacity-100 transition-opacity ml-2">
                                                        <div className="flex flex-col gap-px">
                                                            <button onClick={() => moveScene(act.id, scene.id || 0, 'up')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Scene Omhoog"><ArrowUp className="w-3 h-3" /></button>
                                                            <button onClick={() => moveScene(act.id, scene.id || 0, 'down')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Scene Omlaag"><ArrowDown className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="w-px h-6 bg-white/10" />

                                                        <div className="flex flex-col gap-px">
                                                            <button onClick={() => {
                                                                const firstEventIdx = scene.events[0]?.rows[0]?.originalIndex ?? 0
                                                                insertScene(firstEventIdx, 'before')
                                                            }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Scene In (Voor)"><Plus className="w-2.5 h-2.5" /></button>
                                                            <button onClick={() => {
                                                                const lastEventNode = scene.events[scene.events.length - 1]
                                                                const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                                                                if (lastRow) insertScene(lastRow.originalIndex, 'after')
                                                            }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Scene In (Na)"><Plus className="w-2.5 h-2.5" /></button>
                                                        </div>
                                                        <div className="w-px h-6 bg-white/10" />

                                                        <button onClick={() => {
                                                            const firstEventIdx = scene.events[0]?.rows[0]?.originalIndex ?? 0
                                                            insertEvent(firstEventIdx, 'before')
                                                        }} className="p-1.5 hover:bg-white/10 rounded flex items-center justify-center text-blue-400" title="Voeg Eerste Event Toe">
                                                            <PlusSquare className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button onClick={(e) => { e.stopPropagation(); addSceneComment(act.id, scene.id || 0); }} className="p-1.5 hover:bg-white/10 rounded flex items-center justify-center text-white/50 hover:text-white" title="Voeg Commentaar Toe Aan Scene">
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button onClick={() => {
                                                            openModal({
                                                                title: 'Scene Verwijderen',
                                                                message: `Weet je zeker dat je Scene "SCENE ${scene.id}" en alle inhoud wilt verwijderen?`,
                                                                type: 'confirm',
                                                                onConfirm: () => deleteScene(act.id, scene.id || 0)
                                                            })
                                                        }} className="p-1.5 hover:bg-red-500/20 rounded flex items-center justify-center text-red-500/50 hover:text-red-500" title="Verwijder Scene">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {!sceneCollapsed && (() => {
                                                // Pre-pass: extract trigger row per event for EventTransition strip
                                                const eventNodesWithTriggers = scene.events.map(en => {
                                                    const triggerRow = en.rows.find(r => r.event.type?.toLowerCase() === 'trigger')
                                                    return { eventNode: en, triggerRow }
                                                })

                                                return (
                                                    <div className="space-y-0">
                                                        {eventNodesWithTriggers.map(({ eventNode, triggerRow }, eventIdx) => {
                                                            // Dynamic Collapse
                                                            const eventCollapsed = collapsedGroups[eventNode.uniqueId] ?? isLocked

                                                            const titleRow = eventNode.rows.find(r => r.event.type?.toLowerCase() === 'title')
                                                            // Rows inside card: exclude title, trigger, act, scene headers
                                                            const allContentRows = eventNode.rows.filter(r => {
                                                                const type = r.event.type?.toLowerCase()
                                                                return type !== 'title' && type !== 'act' && type !== 'scene' && type !== 'trigger'
                                                            })

                                                            // Actions and Comments are functional and should always be visible (even when collapsed)
                                                            const alwaysVisibleRows = allContentRows.filter(r => {
                                                                const type = r.event.type?.toLowerCase()
                                                                if (type === 'action') return true
                                                                if (type !== 'comment') return false
                                                                const cue = (r.event.cue || '').trim()
                                                                return cue !== '' && cue !== 'Nieuw commentaar' && cue !== 'Opmerkingen' && cue !== 'Opmerking'
                                                            })

                                                            // Light and Media are technical details and can be collapsed
                                                            const collapsibleRows = allContentRows.filter(r => {
                                                                const type = r.event.type?.toLowerCase()
                                                                return type === 'light' || type === 'media'
                                                            })

                                                            // If an event has no underlying rows, don't show the collapse toggle.
                                                            const hasUnderlyingRows = (alwaysVisibleRows.length + collapsibleRows.length) > 0

                                                            // Calculate summary for header tags
                                                            const summaryCounts = eventNode.rows.reduce((acc, r) => {
                                                                const t = r.event.type?.toLowerCase() || 'unknown'
                                                                if (t === 'title' || t === 'trigger') return acc
                                                                if (t === 'comment') {
                                                                    const cue = (r.event.cue || '').trim()
                                                                    if (!cue || cue === 'Nieuw commentaar' || cue === 'Opmerkingen' || cue === 'Opmerking') return acc
                                                                }
                                                                acc[t] = (acc[t] || 0) + 1
                                                                return acc
                                                            }, {} as Record<string, number>)

                                                            const eventDuration = eventNode.duration

                                                            // Check if the active event's timing has elapsed (for blinking "Next")
                                                            let activeTimeElapsed = false
                                                            if (eventNode.isNext && eventNode.activeDuration > 0 && lastTransitionTime) {
                                                                const effectiveTime = isPaused ? (pauseStartTime || currentTime.getTime()) : currentTime.getTime()
                                                                const elapsed = Math.round((effectiveTime - lastTransitionTime) / 1000)
                                                                activeTimeElapsed = elapsed >= eventNode.activeDuration
                                                            }

                                                            // Calculate remaining time for the active event countdown
                                                            let remainingTime = 0
                                                            let showCountdown = false
                                                            if (eventNode.isActive && eventDuration > 0 && lastTransitionTime) {
                                                                const effectiveTime = isPaused ? (pauseStartTime || currentTime.getTime()) : currentTime.getTime()
                                                                const elapsed = Math.round((effectiveTime - lastTransitionTime) / 1000)
                                                                remainingTime = Math.max(0, eventDuration - elapsed)
                                                                showCountdown = true
                                                            }

                                                            // Card-level selection: is any row in this event selected?
                                                            const isCardSelected = !isLocked && selectedEvent &&
                                                                selectedEvent.act === eventNode.rows[0]?.event.act &&
                                                                selectedEvent.sceneId === eventNode.rows[0]?.event.sceneId &&
                                                                selectedEvent.eventId === eventNode.rows[0]?.event.eventId

                                                            // Only hide the transition strip if this is truly the last event in the whole show.
                                                            // If there's a next scene/act, we still want a transition line between the last event
                                                            // of the current scene/act and the next event.
                                                            const hasNextInScene = eventIdx < eventNodesWithTriggers.length - 1
                                                            const hasNextSceneInAct = !hasNextInScene && act.scenes.slice(sceneIndex + 1).some(sc => (sc.events?.length || 0) > 0)
                                                            const hasNextAct = !hasNextInScene && !hasNextSceneInAct && hierarchy.slice(actIndex + 1).some(a => (a.scenes || []).some(sc => (sc.events?.length || 0) > 0))
                                                            const isLastEvent = !(hasNextInScene || hasNextSceneInAct || hasNextAct)

                                                            return (
                                                                <div key={eventNode.uniqueId} className="ml-6 pl-2 border-l border-white/5 relative">
                                                                    {/* EVENT CARD */}
                                                                    <div
                                                                        ref={eventNode.isActive ? activeGroupRef : null}
                                                                        className={cn(
                                                                            "relative rounded-lg transition-all duration-300 overflow-hidden group/event mb-1",
                                                                            // Base border & background
                                                                            eventNode.isActive
                                                                                ? "border-2 border-green-500/60 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.08)]"
                                                                                : eventNode.isNext
                                                                                    ? "border-2 border-orange-400/50 bg-orange-500/5"
                                                                                    : isCardSelected
                                                                                        ? "border-2 border-blue-400/70 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                                                                                        : "border border-white/8 bg-black/20 hover:border-white/15 hover:bg-white/3",
                                                                        )}
                                                                    >
                                                                        {/* ═══ EVENT CARD HEADER (hidden for 1-event scenes where name = scene name) ═══ */}
                                                                        {(() => {
                                                                            const singleEventScene = scene.events.length === 1
                                                                            const eventNameMatchesScene = titleRow?.event.cue?.trim() === sceneDesc?.trim()
                                                                            const hideHeader = singleEventScene && eventNameMatchesScene
                                                                            if (hideHeader) return null
                                                                            return null // placeholder - full header below
                                                                        })()}
                                                                        {(() => {
                                                                            const hideHeader = scene.events.length === 1 && titleRow?.event.cue?.trim() === sceneDesc?.trim()
                                                                            if (hideHeader) return null
                                                                            return (
                                                                                <div className={cn(
                                                                                    "flex items-center justify-between px-3 py-2 border-b",
                                                                                    eventNode.isActive ? "bg-green-500/10 border-green-500/20" :
                                                                                        eventNode.isNext ? "bg-orange-500/8 border-orange-500/20" :
                                                                                            isCardSelected ? "bg-blue-500/8 border-blue-500/20" :
                                                                                                "bg-black/30 border-white/5"
                                                                                )}>
                                                                                    {/* Left: collapse toggle + event name */}
                                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                        {hasUnderlyingRows && (
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); toggleCollapse(eventNode.uniqueId) }}
                                                                                                className="p-1 hover:bg-white/10 rounded -ml-1 shrink-0"
                                                                                                title={eventCollapsed ? "Uitklappen" : "Inklappen"}
                                                                                            >
                                                                                                {eventCollapsed ? <ChevronRight className="w-3.5 h-3.5 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
                                                                                            </button>
                                                                                        )}

                                                                                        {/* Event name (from title row cue) */}
                                                                                        {titleRow ? (
                                                                                            !isLocked ? (
                                                                                                <RenamableInput
                                                                                                    className={cn(
                                                                                                        "bg-transparent font-bold text-xs outline-none border-b border-transparent focus:border-white/30 flex-1 min-w-0 uppercase tracking-wider",
                                                                                                        hasUnderlyingRows && "ml-4",
                                                                                                        eventNode.isActive ? "text-green-400" :
                                                                                                            eventNode.isNext ? "text-orange-400" :
                                                                                                                "text-orange-500/90"
                                                                                                    )}
                                                                                                    value={titleRow.event.cue || ''}
                                                                                                    placeholder="Event naam..."
                                                                                                    onRename={(val) => {
                                                                                                        const updateEvent = useSequencerStore.getState().updateEvent
                                                                                                        updateEvent(titleRow.originalIndex, { cue: val })
                                                                                                    }}
                                                                                                />
                                                                                            ) : (
                                                                                                <span className={cn(
                                                                                                    "font-bold text-xs truncate flex-1 uppercase tracking-wider",
                                                                                                    hasUnderlyingRows && "ml-4",
                                                                                                    eventNode.isActive ? "text-green-400" :
                                                                                                        eventNode.isNext ? "text-orange-400" :
                                                                                                            "text-orange-500/90"
                                                                                                )}>
                                                                                                    {titleRow.event.cue || <span className="opacity-30 italic">Naamloos event</span>}
                                                                                                </span>
                                                                                            )
                                                                                        ) : (
                                                                                            <span className="font-semibold text-sm opacity-30 italic">Event</span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Right: meta tags + status + controls */}
                                                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                                        {/* Event number (edit mode): scene-event */}
                                                                                        {!isLocked && (
                                                                                            <span className="text-[9px] font-mono opacity-25 shrink-0">
                                                                                                Event {(eventNode.rows?.[0]?.event?.sceneId ?? 0)}-{(eventNode.rows?.[0]?.event?.eventId ?? 0)}
                                                                                            </span>
                                                                                        )}
                                                                                        {/* Script page */}
                                                                                        {!isLocked && titleRow && (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] font-bold text-blue-200">
                                                                                                <span className="opacity-70">Pg</span>
                                                                                                <RenamableInput
                                                                                                    className="w-10 bg-transparent outline-none text-[9px] font-mono font-bold text-blue-100 text-center border-b border-transparent focus:border-blue-300/60"
                                                                                                    value={(titleRow.event.scriptPg || 0).toString()}
                                                                                                    placeholder="0"
                                                                                                    onRename={(val) => {
                                                                                                        const n = parseInt((val || '').trim()) || 0
                                                                                                        const updateEvent = useSequencerStore.getState().updateEvent
                                                                                                        updateEvent(titleRow.originalIndex, { scriptPg: n })
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                        {isLocked && titleRow?.event.scriptPg !== undefined && titleRow.event.scriptPg > 0 && (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] font-bold text-blue-300">
                                                                                                Pg {titleRow.event.scriptPg}
                                                                                            </div>
                                                                                        )}
                                                                                        {/* Duration */}
                                                                                        {!isLocked && titleRow?.event.duration !== undefined && titleRow.event.duration > 0 && (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono opacity-60">
                                                                                                {formatTime(titleRow.event.duration)}
                                                                                            </div>
                                                                                        )}
                                                                                        {/* Content summary tags */}
                                                                                        {summaryCounts['action'] > 0 && (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-[9px] text-yellow-300">
                                                                                                <User className="w-3 h-3" /> {summaryCounts['action']}
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
                                                                                        {summaryCounts['comment'] > 0 && (
                                                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] opacity-50">
                                                                                                <Info className="w-3 h-3" /> {summaryCounts['comment']}
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Status indicators */}
                                                                                        {eventNode.isActive && (
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                                                                {showCountdown ? (
                                                                                                    <span className={cn(
                                                                                                        "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tabular-nums",
                                                                                                        remainingTime === 0 ? "text-red-400 bg-red-500/10 border border-red-500/20 animate-bright-pulse" : "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
                                                                                                    )}>
                                                                                                        <span className="opacity-50 mr-1 italic">ToGo:</span>{formatTime(remainingTime)}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="text-[9px] font-black uppercase text-green-400 animate-bright-pulse">Active</span>
                                                                                                )}
                                                                                            </div>
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
                                                                                                )}>Next</span>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Event Controls (edit mode only) */}
                                                                                        {!isLocked && (
                                                                                            <div className="flex items-center gap-1.5 opacity-0 group-hover/event:opacity-100 transition-opacity ml-1">
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
                                                                                                        message: `Weet je zeker dat je groep ${act.id} - ${scene.id || 0}.${eventNode.id || 0} wilt verwijderen?`,
                                                                                                        type: 'confirm',
                                                                                                        onConfirm: () => deleteGroup(act.id, scene.id || 0, eventNode.id || 0)
                                                                                                    })
                                                                                                }} className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500" title="Verwijder Event"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })()}

                                                                        {/* ═══ ALWAYS VISIBLE ROWS (Comments, Actions) ═══ */}
                                                                        {alwaysVisibleRows.length > 0 && (
                                                                            <div className="flex flex-col divide-y divide-white/5 border-t border-white/5">
                                                                                {alwaysVisibleRows.map((item, idx) => (
                                                                                    <RowItem
                                                                                        key={`always-${item.id}`}
                                                                                        event={item.event}
                                                                                        originalIndex={item.originalIndex}
                                                                                        id={item.id}
                                                                                        isShadow={item.isShadow}
                                                                                        zebraIndex={idx}
                                                                                        isActiveGroup={eventNode.isActive}
                                                                                        isNextGroup={eventNode.isNext}
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
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* ═══ COLLAPSIBLE ROWS (Light, Media) ═══ */}
                                                                        {!eventCollapsed && collapsibleRows.length > 0 && (
                                                                            <div className="flex flex-col divide-y divide-white/5 border-t border-white/5">
                                                                                {(() => {
                                                                                    const usedFixtures = eventNode.rows.map(r => r.event.fixture).filter(Boolean)
                                                                                    const base = alwaysVisibleRows.length
                                                                                    return collapsibleRows.map((item, idx) => (
                                                                                        <RowItem
                                                                                            key={`row-${item.id}`}
                                                                                            event={{ ...item.event, usedFixtures } as any}
                                                                                            originalIndex={item.originalIndex}
                                                                                            id={item.id}
                                                                                            isShadow={item.isShadow}
                                                                                            zebraIndex={base + idx}
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
                                                                                    ))
                                                                                })()}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ═══ TRANSITION STRIP between events ═══ */}
                                                                    <EventTransition
                                                                        triggerEvent={triggerRow?.event || null}
                                                                        isLastEvent={isLastEvent}
                                                                        isLocked={isLocked}
                                                                        triggerIndex={triggerRow?.originalIndex}
                                                                        onEditTrigger={(idx) => {
                                                                            if (typeof idx === 'number') {
                                                                                openTransitionEditor(idx)
                                                                            } else {
                                                                                // No trigger row yet → create one and open editor
                                                                                ensureTriggerAndEdit(eventNode, titleRow?.originalIndex)
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            })()}

                                        </div>
                                    )
                                })}
                            </div>
                        )
                        }
                    </div >
                )
            })}
        </div >
    )
}

export default SequenceGrid
