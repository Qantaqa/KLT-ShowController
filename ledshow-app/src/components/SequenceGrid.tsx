import React, { useMemo, useState, useEffect, useRef } from 'react'
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
    Monitor
} from 'lucide-react'
import { useShowStore } from '../store/useShowStore'
import type { ShowEvent } from '../services/xml-service'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

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


const RowItem: React.FC<{
    event: ShowEvent
    originalIndex: number
    isActiveGroup?: boolean
    isNextGroup?: boolean
    handleRowClick: (index: number) => void
    handleRowDoubleClick: (index: number) => void
    editingIndex: number | null
    setEditingIndex: (index: number | null) => void
    menuOpenIndex: number | null
    setMenuOpenIndex: (index: number | null) => void
    activeShow: any
    isLocked: boolean
    activeEventIndex: number
    eventStatuses: any
    currentTime: Date
    lastTransitionTime: number | null
    isTimeTracking: boolean
    /* Actions */
    updateEvent: (index: number, partial: Partial<ShowEvent>) => void
    deleteGroup: (act: string, scene: number, event: number) => void
    deleteEvent: (index: number) => void
    resendEvent: (index: number) => void
    renameAct: any
    renameScene: any
    moveAct: any
    moveScene: any
    moveEvent: any
    insertAct: any
    insertScene: any
    insertEvent: any
    addEventAbove: any
    addEventBelow: any
    restartMedia: any
    stopMedia: any
    toggleAudio: any
    toggleRepeat: any
    handleDelete: any
    setMediaVolume: (index: number, volume: number) => void
}> = ({
    event, originalIndex, isActiveGroup, isNextGroup, handleRowClick, handleRowDoubleClick,
    editingIndex, setEditingIndex, menuOpenIndex, setMenuOpenIndex, activeShow, isLocked,
    activeEventIndex, eventStatuses, currentTime, lastTransitionTime, isTimeTracking,
    updateEvent, resendEvent, renameAct, renameScene,
    moveAct, moveScene, moveEvent, insertAct, insertScene, insertEvent, addEventAbove,
    addEventBelow, restartMedia, stopMedia, toggleAudio, toggleRepeat, handleDelete,
    setMediaVolume
}) => {
        const isRowActive = originalIndex === activeEventIndex
        const type = event.type?.toLowerCase() || ''
        const status = eventStatuses[originalIndex]
        const videoRef = useRef<HTMLVideoElement>(null)

        // Sync Playback for Active Row
        useEffect(() => {
            if (!videoRef.current) return
            if (isRowActive) {
                videoRef.current.play().catch(e => console.warn('Preview play failed', e))
            } else {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
            }
        }, [isRowActive])

        if (!event) return null
        const getDevices = () => activeShow?.devices || []

        return (
            <div
                onClick={() => handleRowClick(originalIndex)}
                onDoubleClick={() => handleRowDoubleClick(originalIndex)}
                className={cn(
                    "group/row relative flex items-center px-4 py-2 transition-all cursor-pointer border-l-2",
                    isRowActive ? "bg-green-500/20 border-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]" : "border-transparent hover:bg-white/5",
                    isActiveGroup && !isRowActive && "border-l-green-500/30",
                    isNextGroup && !isRowActive && "border-l-yellow-500/30",
                    type === 'title' && (
                        isRowActive ? "bg-green-500/10 font-bold" :
                            isNextGroup ? "bg-yellow-500/5 font-bold border-l-yellow-500/50" :
                                "bg-white/5 font-bold border-l-primary/40"
                    ),
                    type === 'comment' && "opacity-60 italic text-[11px]",
                    type === 'action' && "bg-yellow-500/10 border-l-yellow-500 text-yellow-200"
                )}
            >
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    {type === 'title' && <Type className="w-3.5 h-3.5 opacity-60" />}
                    {type === 'comment' && <Info className="w-3.5 h-3.5 opacity-60" />}
                    {type === 'action' && <User className="w-3.5 h-3.5 text-yellow-500" />}
                    {(type === 'light' || type === 'media') && <Zap className="w-3.5 h-3.5 opacity-30" />}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                    {editingIndex === originalIndex ? (
                        <div className="space-y-1 py-1" onClick={(e) => e.stopPropagation()} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setEditingIndex(null) } }}>
                            <div className="flex gap-2">
                                <RenamableInput autoFocus className="flex-1 bg-white/10 border border-primary/40 rounded px-2 py-1 text-xs text-white outline-none focus:bg-white/20" value={event.cue || ''} placeholder="Event Cue" onRename={(val) => updateEvent(originalIndex, { cue: val })} />
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
                            {type !== 'title' && type !== 'comment' && (
                                <div className="flex gap-2 items-center">
                                    {type === 'media' ? (
                                        <>
                                            <select title="Doel Scherm" className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none" value={event.fixture || ''} onChange={(e) => updateEvent(originalIndex, { fixture: e.target.value })}>
                                                <option className="bg-zinc-900" value="">Selecteer Doel...</option>
                                                <option className="bg-zinc-900" value="*">ALLE LOKALE SCHERMEN (*)</option>
                                                {getDevices().filter((d: any) => d.type === 'local_monitor' || d.type === 'remote_ledwall').map((d: any) => (<option className="bg-zinc-900" key={d.id} value={d.name}>{d.name} ({d.type})</option>))}
                                            </select>

                                            <button className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[10px] flex items-center gap-1 transition-colors" onClick={async () => { if ((window as any).require) { const { ipcRenderer } = (window as any).require('electron'); const result = await ipcRenderer.invoke('select-file', { filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi'] }] }); if (!result.canceled && result.filePaths.length > 0) { updateEvent(originalIndex, { filename: result.filePaths[0] }) } } }}>
                                                <FolderOpen className="w-3 h-3" /> Source
                                            </button>
                                        </>
                                    ) : (
                                        <RenamableInput className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white/60 outline-none" value={event.fixture || ''} placeholder="Fixture / Device" onRename={(val) => updateEvent(originalIndex, { fixture: val })} />
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-4">
                                <div className={cn("text-xs truncate flex items-center gap-2", type === 'action' && "font-black uppercase tracking-wider", type === 'title' && "text-sm text-primary")}>
                                    {event.cue}
                                    {type === 'media' && event.filename && (
                                        <span className="text-[9px] opacity-40 font-mono bg-white/5 px-1 rounded truncate max-w-[150px]" title={event.filename}>{event.filename.split(/[\\/]/).pop()}</span>
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
                                    <video ref={videoRef} src={`ledshow-file:///${event.filename.replace(/\\/g, '/')}`} className="w-full h-full object-cover" muted />
                                    <div className="absolute top-1 right-1 px-1 bg-black/60 text-[7px] font-bold rounded text-white/50 uppercase">Preview</div>
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
                    {editingIndex === originalIndex ? (
                        <button onClick={(e) => { e.stopPropagation(); setEditingIndex(null) }} className="p-1 px-2 bg-green-500/20 hover:bg-green-500/40 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1 text-green-400"><Check className="w-3 h-3" /> Klaar</button>
                    ) : (
                        <div className="relative">
                            {!isLocked || (type === 'light' || type === 'media') ? (
                                <button id={`row-menu-${originalIndex}`} onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === originalIndex ? null : originalIndex) }} title="Context Menu" className="p-1 hover:bg-white/10 rounded"><MoreVertical className="w-3.5 h-3.5" /></button>
                            ) : null}
                            {menuOpenIndex === originalIndex && (
                                <ContextMenu index={originalIndex} event={event} type={type} isLocked={isLocked} onClose={() => setMenuOpenIndex(null)} anchorRect={document.getElementById(`row-menu-${originalIndex}`)?.getBoundingClientRect() || undefined} handlers={{ setEditingIndex, resendEvent, renameAct, renameScene, moveAct, moveScene, moveEvent, insertAct, insertScene, insertEvent, addEventAbove, addEventBelow, handleDelete, restartMedia, stopMedia, toggleAudio, toggleRepeat }} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

const SequenceGrid: React.FC = () => {
    const {
        events,
        activeEventIndex,
        setActiveEvent,
        activeShow,
        isLocked,
        addEventAbove,
        addEventBelow,
        insertAct,
        insertScene,
        insertEvent,
        renameAct, renameScene,
        moveAct, moveScene, moveEvent,
        deleteEvent,
        deleteGroup,
        updateEvent,
        resendEvent,
        eventStatuses,
        isTimeTracking,

        lastTransitionTime,
        restartMedia,
        stopMedia,
        toggleAudio,
        toggleRepeat,
        setMediaVolume,
        deleteAct,
        deleteScene,
        updateShow
    } = useShowStore() as any

    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null)

    // Use store state for persistence
    const collapsedGroups = activeShow?.viewState?.collapsedGroups || {}
    const toggleCollapse = (uniqueId: string) => {
        const newCollapsed = { ...collapsedGroups, [uniqueId]: !collapsedGroups[uniqueId] }
        updateShow({ viewState: { ...activeShow?.viewState, collapsedGroups: newCollapsed } })
    }

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



    const [currentTime, setCurrentTime] = useState(Date.now())

    useEffect(() => {
        if (activeEventIndex < 0) return
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
        return () => clearInterval(interval)
    }, [activeEventIndex])

    const formatTime = (seconds: number) => {
        const m = Math.floor(Math.abs(seconds) / 60)
        const s = Math.floor(Math.abs(seconds) % 60)
        return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`
    }



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
                eventNode = { id: event.eventId, uniqueId, rows: [], isActive: false, isNext: false, duration: 0, activeDuration: 0 }
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

        // 3. Calculate durations for each event node
        // The duration is stored on the Title row of each event group
        const activeDuration = activeNodeIdx >= 0
            ? (allEventNodes[activeNodeIdx].eventNode.rows.find(r => r.event.type === 'Title')?.event.duration || 0)
            : 0

        for (const { eventNode } of allEventNodes) {
            const titleRow = eventNode.rows.find(r => r.event.type === 'Title')
            eventNode.duration = titleRow?.event.duration || 0
            // Store the active event's duration on the "next" node so it can blink when elapsed
            if (eventNode.isNext) {
                eventNode.activeDuration = activeDuration
            }
        }

        // 4. Sort rows within events
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
                            return 99
                        }
                        return getPriority(a.event.type) - getPriority(b.event.type)
                    })
                })
            })
        })

        return acts
    }, [events, activeEventIndex])

    const handleRowClick = (originalIndex: number) => {
        if (!isLocked) {
            setEditingIndex(originalIndex)
        }
    }

    const handleRowDoubleClick = (originalIndex: number) => {
        // Double click ALWAYS activates (even in locked mode)
        setActiveEvent(originalIndex)
    }




    const handleDelete = (originalIndex: number, event: ShowEvent) => {
        if (isLocked) return
        const type = event.type?.toLowerCase()

        if (type === 'title') {
            if (confirm(`Weet je zeker dat je de gehele groep (${event.act} - ${event.sceneId}.${event.eventId}) wilt verwijderen?`)) {
                deleteGroup(event.act, event.sceneId, event.eventId)
            }
        } else if (type === 'comment') {
            updateEvent(originalIndex, { cue: '' })
        } else {
            deleteEvent(originalIndex)
        }
        setMenuOpenIndex(null)
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
                                    <button onClick={() => deleteAct(act.id)} className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500" title="Verwijder Act"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            )}
                        </div>

                        {!actCollapsed && (
                            <div className="pl-4 space-y-4 border-l border-white/5 ml-2">
                                {act.scenes.map((scene) => {
                                    const firstEvent = scene.events[0]?.rows[0]?.event
                                    const sceneDesc = (firstEvent?.type === 'Title' ? firstEvent.cue : '') || ''

                                    // Dynamic Collapse
                                    const sceneCollapsed = collapsedGroups[`scene-${act.id}-${scene.id}`]

                                    return (
                                        <div key={scene.id} className="relative group/scene">
                                            {/* SCENE Header */}
                                            <div className="flex items-center justify-between mb-2 pr-4">
                                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded text-xs font-bold text-muted-foreground uppercase tracking-wider flex-1 mr-4">
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

                                                {/* Scene Controls */}
                                                {!isLocked && (
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover/scene:opacity-100 transition-opacity ml-2">
                                                        <div className="flex flex-col gap-px">
                                                            <button onClick={() => moveScene(act.id, scene.id, 'up')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Scene Omhoog"><ArrowUp className="w-3 h-3" /></button>
                                                            <button onClick={() => moveScene(act.id, scene.id, 'down')} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Verplaats Scene Omlaag"><ArrowDown className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="w-px h-6 bg-white/10" />
                                                        <div className="flex flex-col gap-px">
                                                            <button onClick={() => {
                                                                const firstEventIdx = scene.events[0]?.rows[0]?.originalIndex ?? 0
                                                                insertScene(firstEventIdx, 'before')
                                                            }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Scene In (Voor)"><Plus className="w-3 h-3" /></button>
                                                            <button onClick={() => {
                                                                const lastEventNode = scene.events[scene.events.length - 1]
                                                                const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                                                                if (lastRow) insertScene(lastRow.originalIndex, 'after')
                                                            }} className="p-0.5 hover:bg-white/10 rounded text-white/40 hover:text-white leading-none" title="Voeg Scene In (Na)"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="w-px h-6 bg-white/10" />
                                                        <button onClick={() => deleteScene(act.id, scene.id)} className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500" title="Verwijder Scene"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </div>

                                            {!sceneCollapsed && (
                                                <div className="pl-4 space-y-3">
                                                    {scene.events.map((eventNode) => {
                                                        // Dynamic Collapse
                                                        const eventCollapsed = collapsedGroups[eventNode.uniqueId]

                                                        const titleRow = eventNode.rows.find(r => r.event.type === 'Title')
                                                        const otherRows = eventNode.rows.filter(r => r.event.type !== 'Title')

                                                        // Calculate summary for collapsed state
                                                        const summaryCounts = otherRows.reduce((acc, r) => {
                                                            const t = r.event.type || 'Unknown'
                                                            acc[t] = (acc[t] || 0) + 1
                                                            return acc
                                                        }, {} as Record<string, number>)

                                                        // Timing calculations using pre-computed data from useMemo
                                                        const eventDuration = eventNode.duration

                                                        // Check if the active event's timing has elapsed (for blinking "Next")
                                                        let activeTimeElapsed = false
                                                        if (eventNode.isNext && eventNode.activeDuration > 0 && lastTransitionTime) {
                                                            const elapsed = Math.round((currentTime - lastTransitionTime) / 1000)
                                                            activeTimeElapsed = elapsed >= eventNode.activeDuration
                                                        }

                                                        // Calculate remaining time for the active event countdown
                                                        let remainingTime = 0
                                                        let showCountdown = false
                                                        if (eventNode.isActive && eventDuration > 0 && lastTransitionTime) {
                                                            const elapsed = Math.round((currentTime - lastTransitionTime) / 1000)
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
                                                                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-50">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); toggleCollapse(eventNode.uniqueId) }}
                                                                            className="p-0.5 hover:bg-white/10 rounded -ml-1"
                                                                        >
                                                                            {eventCollapsed ? <ChevronRight className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
                                                                        </button>
                                                                        <span>Event {eventNode.id}</span>
                                                                        <span className="opacity-20">|</span>
                                                                        <span className="flex items-center gap-1">
                                                                            <ChevronRight className="w-3 h-3" /> Manual Trigger
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
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
                                                                                <button onClick={() => deleteGroup(act.id, scene.id, eventNode.id)} className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500" title="Verwijder Event"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Actual Grid Rows */}
                                                                <div className="flex flex-col">
                                                                    {titleRow && <RowItem
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
                                                                        currentTime={new Date(currentTime)}
                                                                        lastTransitionTime={lastTransitionTime}
                                                                        isTimeTracking={isTimeTracking}
                                                                        updateEvent={updateEvent}
                                                                        deleteGroup={deleteGroup}
                                                                        deleteEvent={deleteEvent}
                                                                        resendEvent={resendEvent}
                                                                        renameAct={renameAct}
                                                                        renameScene={renameScene}
                                                                        moveAct={moveAct}
                                                                        moveScene={moveScene}
                                                                        moveEvent={moveEvent}
                                                                        insertAct={insertAct}
                                                                        insertScene={insertScene}
                                                                        insertEvent={insertEvent}
                                                                        addEventAbove={addEventAbove}
                                                                        addEventBelow={addEventBelow}
                                                                        restartMedia={restartMedia}
                                                                        stopMedia={stopMedia}
                                                                        toggleAudio={toggleAudio}
                                                                        toggleRepeat={toggleRepeat}
                                                                        handleDelete={handleDelete}
                                                                        setMediaVolume={setMediaVolume}
                                                                    />}

                                                                    {!eventCollapsed ? (
                                                                        otherRows.map(item => (
                                                                            <RowItem
                                                                                key={`row-${item.originalIndex}`}
                                                                                event={item.event}
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
                                                                                currentTime={new Date(currentTime)}
                                                                                lastTransitionTime={lastTransitionTime}
                                                                                isTimeTracking={isTimeTracking}
                                                                                updateEvent={updateEvent}
                                                                                deleteGroup={deleteGroup}
                                                                                deleteEvent={deleteEvent}
                                                                                resendEvent={resendEvent}
                                                                                renameAct={renameAct}
                                                                                renameScene={renameScene}
                                                                                moveAct={moveAct}
                                                                                moveScene={moveScene}
                                                                                moveEvent={moveEvent}
                                                                                insertAct={insertAct}
                                                                                insertScene={insertScene}
                                                                                insertEvent={insertEvent}
                                                                                addEventAbove={addEventAbove}
                                                                                addEventBelow={addEventBelow}
                                                                                restartMedia={restartMedia}
                                                                                stopMedia={stopMedia}
                                                                                toggleAudio={toggleAudio}
                                                                                toggleRepeat={toggleRepeat}
                                                                                handleDelete={handleDelete}
                                                                                setMediaVolume={setMediaVolume}
                                                                            />
                                                                        ))
                                                                    ) : (
                                                                        otherRows.length > 0 && (
                                                                            <div className="px-10 py-1.5 flex gap-4 text-[10px] text-muted-foreground bg-white/5 font-mono">
                                                                                {Object.entries(summaryCounts).map(([type, count]) => (
                                                                                    <span key={type} className="flex items-center gap-1">
                                                                                        <span className="font-bold text-white/40">{count}</span> {type}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )
                                                                    )}
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
        handleDelete: (i: number, e: ShowEvent) => void
        restartMedia: (i: number) => void
        stopMedia: (i: number) => void
        toggleAudio: (i: number) => void
        toggleRepeat: (i: number) => void
    }
}> = ({ index, event, type, isLocked, onClose, anchorRect, handlers }) => {
    const [subMenu, setSubMenu] = useState<'construct' | 'rows' | 'media' | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [isFlipped, setIsFlipped] = useState(false)

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

            {type === 'light' && (
                <button onClick={() => { handlers.resendEvent(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-blue-400">
                    <Send className="w-3 h-3" /> Herzenden
                </button>
            )}



            {!isLocked && <div className="h-px bg-white/5 my-1" />}

            {!isLocked && (
                <>
                    <div className="relative group/sub">
                        <button
                            onMouseEnter={() => setSubMenu('construct')}
                            className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Nieuwe Regel Na...
                            </div>
                            <ChevronRight className="w-2.5 h-2.5 opacity-30" />
                        </button>
                        {subMenu === 'construct' && (
                            <div className={cn(
                                "absolute right-full w-40 glass border border-white/10 rounded-lg shadow-2xl py-1 mr-1",
                                isFlipped ? "bottom-0" : "top-0"
                            )}>
                                <button onClick={() => { handlers.addEventBelow(index, 'Action', 'Aktie'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><User className="w-3 h-3 text-blue-400" /> Aktie Regel</button>
                                <button onClick={() => { handlers.addEventBelow(index, 'Light', 'Licht'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-400" /> Licht Regel</button>
                                <button onClick={() => { handlers.addEventBelow(index, 'Media', 'Media'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Layers className="w-3 h-3 text-purple-400" /> Media Regel</button>
                            </div>
                        )}
                    </div>

                    {(type !== 'title' && type !== 'comment') && (
                        <div className="relative group/sub">
                            <button
                                onMouseEnter={() => setSubMenu('rows')}
                                className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <ArrowDown className="w-3 h-3" /> Nieuwe Regel Voor...
                                </div>
                                <ChevronRight className="w-2.5 h-2.5 opacity-30" />
                            </button>
                            {subMenu === 'rows' && (
                                <div className={cn(
                                    "absolute right-full w-40 glass border border-white/10 rounded-lg shadow-2xl py-1 mr-1",
                                    isFlipped ? "bottom-0" : "top-0"
                                )}>
                                    <button onClick={() => { handlers.addEventAbove(index, 'Action', 'Aktie'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><User className="w-3 h-3 text-blue-400" /> Aktie Regel</button>
                                    <button onClick={() => { handlers.addEventAbove(index, 'Light', 'Licht'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-400" /> Licht Regel</button>
                                    <button onClick={() => { handlers.addEventAbove(index, 'Media', 'Media'); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Layers className="w-3 h-3 text-purple-400" /> Media Regel</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-px bg-white/5 my-1" />

                    <button onClick={() => { handlers.handleDelete(index, event); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 text-red-500">
                        <Trash2 className="w-3 h-3" /> {type === 'comment' ? 'Leegmaken' : type === 'title' ? 'Groep Verwijderen' : 'Verwijderen'}
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

export default SequenceGrid
