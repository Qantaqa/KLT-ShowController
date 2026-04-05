import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, Play, Pause, Square, Volume2, VolumeX, Repeat, Sun, MoreVertical, Edit2, Copy, ClipboardPaste, Send, Plus, Trash2, PlusSquare, Info, Clock, SkipForward, Zap, Monitor, Loader2, Check, AlertCircle, Type, User, MousePointer2, Lightbulb, Layers, ListOrdered, ClipboardCheck, Settings, FileText, Download, Lock, LockOpen, GripVertical, X, Save } from 'lucide-react'
import { useSequencerStore } from '../store/useSequencerStore'
import type { Device } from '../types/devices'
import type { ShowEvent, ClipboardItem } from '../types/show'
import { cn, modalBtnIconClass, modalBtnPrimary, modalBtnSecondary, modalHeaderCloseBtn } from '../lib/utils'
import { ShowCheckPanel } from './ShowCheckPanel'
import { runShowChecks, type ShowCheckIssue } from '../utils/showChecks'
import { getTransitionTimingSamples } from '../utils/transitionTiming'
import VideoWallPreviewOverlay from './VideoWallPreviewOverlay'
import SequenceRowEditModal from './SequenceRowEditModal'
import ActEditModal from './ActEditModal'
import SceneEditModal from './SceneEditModal'
import EventEditModal from './EventEditModal'
import LightFixtureStripPreview from './LightFixtureStripPreview'
import ShowCollapsedTechRow, { isCollapsedShowProjectionMediaRow } from './ShowCollapsedTechRow'
import { isLightStripPreviewEnabled } from '../lib/light-strip-preview'
import LightStripPreviewSwitch from './LightStripPreviewSwitch'

/** Show mode: videowall_agent rows use a slim summary; local_monitor keeps full preview + controls. */
function isProjectionStyleMediaRow(event: ShowEvent, devices: Device[]): boolean {
    if ((event.type || '').toLowerCase() !== 'media') return false
    const d = event.fixture ? devices.find(x => x.name === event.fixture) : undefined
    const t = d?.type
    return t === 'videowall_agent'
}

const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60)
    const s = Math.floor(Math.abs(seconds) % 60)
    return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`
}

// Transition strip rendered BETWEEN event cards (replaces trigger rows in the card body)
// Note: trigger rows are excluded from the card body, so editing must be handled from here.
const showModePastClass = 'opacity-[0.38] saturate-[0.65] contrast-[0.92]'

const SEQUENCE_DND_MIME = 'application/x-showcontroller-sequence'

type SequenceDragPayload =
    | { kind: 'act'; actName: string }
    | { kind: 'scene'; actName: string; sceneId: number }
    | { kind: 'event'; groupStartIndex: number }
    | { kind: 'actionRow'; fromIndex: number }

type ActionRowDnDProps = {
    rowKey: string
    seqDndHover: { targetKey: string; edge: 'before' | 'after' } | null
    seqDndSourceKey: string | null
    onGripDragStart: (e: React.DragEvent) => void
    onGripDragEnd: () => void
    onRowDragOver: (e: React.DragEvent) => void
    onRowDragLeave: (e: React.DragEvent) => void
    onRowDrop: (e: React.DragEvent) => void
}

/** Alleen voor dragOver: getData is niet leesbaar tot drop. */
const sequenceTreeDragRef: { current: SequenceDragPayload | null } = { current: null }

const SEQUENCE_TREE_DRAG_GRIP =
    'h-7 w-7 shrink-0 rounded-md bg-black/35 border border-white/12 flex items-center justify-center text-white/45 cursor-grab active:cursor-grabbing hover:text-primary hover:bg-white/12 hover:border-primary/35'

const SEQUENCE_TREE_MORE_BTN =
    'h-7 w-7 shrink-0 rounded-md bg-black/35 border border-white/12 flex items-center justify-center text-white/55 transition-all duration-150 hover:text-white hover:bg-white/14 hover:border-primary/40 hover:shadow-[0_0_16px_rgba(255,255,255,0.12)]'

/** Vaste chevron-kolom zodat titels op dezelfde x beginnen. */
const TREE_CHEVRON_COL = 'flex h-7 w-7 shrink-0 items-center justify-center'
/** Meta + show/Pg uitgelijnd over alle rijen. */
const TREE_META_RAIL =
    'flex h-7 min-w-[12rem] max-w-[min(42%,20rem)] items-center justify-end gap-1.5 overflow-hidden sm:min-w-[14rem]'
const TREE_RIGHT_CLUSTER = 'flex shrink-0 items-center gap-1'
const TREE_DROP_LINE =
    'pointer-events-none absolute left-0 right-0 z-30 h-[3px] rounded-full bg-primary shadow-[0_0_14px_rgba(250,204,21,0.75)]'

const SEQUENCE_TREE_MENU_ITEM =
    'w-full px-3 py-2 text-left text-[11px] hover:bg-white/10 flex items-center gap-2 text-white/90'

const SEQUENCE_TREE_MENU_LABEL = 'text-[10px] font-bold uppercase tracking-wider text-white/35 px-3 pt-2 pb-1'

const SEQUENCE_TREE_MENU_NEST = 'px-3 pt-2 pb-0.5 pl-4 text-[10px] font-semibold text-white/50'

const SEQUENCE_TREE_MENU_NEST_ITEM =
    'w-full px-3 py-1.5 pl-8 text-left text-[11px] hover:bg-white/10 flex items-center gap-2 text-white/90'

function buildEventTreeMenuContent(
    firstIdx: number,
    lastIdx: number | undefined,
    actId: string,
    sceneId: number,
    eventIdNum: number,
    insertEvent: (index: number, position: 'before' | 'after') => void,
    addEventBelow: (index: number, type?: string, cue?: string) => void,
    setTreeMenu: (v: null) => void,
    openModal: (opts: { title: string; message: string; type: 'confirm'; onConfirm: () => void }) => void,
    deleteGroup: (a: string, s: number, e: number) => void
) {
    return (
        <>
            <div className={SEQUENCE_TREE_MENU_LABEL}>Event</div>
            <button
                type="button"
                className={SEQUENCE_TREE_MENU_ITEM}
                onClick={() => {
                    insertEvent(firstIdx, 'before')
                    setTreeMenu(null)
                }}
            >
                <Plus className="w-3.5 h-3.5 text-primary" /> Invoegen vóór
            </button>
            <button
                type="button"
                className={cn(SEQUENCE_TREE_MENU_ITEM, lastIdx === undefined && 'pointer-events-none opacity-40')}
                disabled={lastIdx === undefined}
                onClick={() => {
                    if (lastIdx !== undefined) insertEvent(lastIdx, 'after')
                    setTreeMenu(null)
                }}
            >
                <Plus className="w-3.5 h-3.5 text-primary" /> Invoegen na
            </button>
            <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold text-white/40">Acties:</div>
            <button
                type="button"
                className={SEQUENCE_TREE_MENU_ITEM}
                onClick={() => {
                    addEventBelow(firstIdx, 'Action', 'Stagehand')
                    setTreeMenu(null)
                }}
            >
                <User className="w-3.5 h-3.5 text-blue-400" /> Toevoegen stagehand (action)
            </button>
            <button
                type="button"
                className={SEQUENCE_TREE_MENU_ITEM}
                onClick={() => {
                    addEventBelow(firstIdx, 'Media', 'Media')
                    useSequencerStore.getState().addToast('Media toegevoegd. Vouw het event uit of gebruik Bewerken.', 'info')
                    setTreeMenu(null)
                }}
            >
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Toevoegen media
            </button>
            <button
                type="button"
                className={SEQUENCE_TREE_MENU_ITEM}
                onClick={() => {
                    addEventBelow(firstIdx, 'Light', 'Licht')
                    useSequencerStore.getState().addToast('Licht toegevoegd. Vouw het event uit of gebruik Bewerken.', 'info')
                    setTreeMenu(null)
                }}
            >
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Toevoegen licht
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
                type="button"
                className={cn(SEQUENCE_TREE_MENU_ITEM, 'text-red-400 hover:bg-red-500/10')}
                onClick={() => {
                    setTreeMenu(null)
                    openModal({
                        title: 'Event verwijderen',
                        message: `Weet je zeker dat je dit event wilt verwijderen (${actId} · scene ${sceneId} · event ${eventIdNum})? Alle rijen in deze groep gaan verloren.`,
                        type: 'confirm',
                        onConfirm: () => deleteGroup(actId, sceneId, eventIdNum),
                    })
                }}
            >
                <Trash2 className="w-3.5 h-3.5" /> Verwijderen event
            </button>
        </>
    )
}

/** Toggles in Show-boom ⋮-menu: live store-state (zelfde gedrag als app-menu). */
const SequenceTreeShowMenuToggles: React.FC = () => {
    const activeShow = useSequencerStore(s => s.activeShow)
    const sequenceReorderMode = !!activeShow?.viewState?.sequenceReorderMode
    const isTimeTracking = useSequencerStore(s => s.isTimeTracking)
    const autoFollowScript = useSequencerStore(s => s.autoFollowScript)
    const toggleTimeTracking = useSequencerStore(s => s.toggleTimeTracking)
    const toggleAutoFollowScript = useSequencerStore(s => s.toggleAutoFollowScript)
    return (
        <>
            <div className="my-1 h-px bg-white/10 mx-2" />
            <div className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                    <GripVertical
                        className={cn(
                            'w-3.5 h-3.5 text-primary shrink-0',
                            !sequenceReorderMode && 'opacity-40',
                            sequenceReorderMode && 'animate-pulse'
                        )}
                    />
                    <div className="flex flex-col min-w-0 text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Volgorde aanpassen</span>
                        <span className="text-[8px] opacity-40 uppercase font-bold text-white">
                            {sequenceReorderMode ? 'Actief' : 'Uitgeschakeld'}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation()
                        const s = useSequencerStore.getState()
                        const show = s.activeShow
                        if (!show) return
                        const next = !show.viewState?.sequenceReorderMode
                        void s.updateActiveShow({
                            viewState: { ...show.viewState, sequenceReorderMode: next },
                        })
                    }}
                    className={cn(
                        'w-10 h-5 shrink-0 rounded-full relative transition-all duration-500 p-1 border border-white/10',
                        sequenceReorderMode ? 'bg-primary/20 shadow-[inset_0_0_10px_rgba(250,204,21,0.12)]' : 'bg-white/5 shadow-inner'
                    )}
                    title="Volgorde aanpassen: grip tonen i.p.v. ⋮-menu"
                >
                    <div
                        className={cn(
                            'w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg',
                            sequenceReorderMode
                                ? 'ml-auto bg-primary shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                : 'mr-auto bg-white/20'
                        )}
                    />
                </button>
            </div>
            <div className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors border-t border-white/5">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Clock className={cn('w-3.5 h-3.5 text-primary shrink-0', !isTimeTracking && 'opacity-40', isTimeTracking && 'animate-pulse')} />
                    <div className="flex flex-col min-w-0 text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Timing bijhouden</span>
                        <span className="text-[8px] opacity-40 uppercase font-bold text-white">
                            {isTimeTracking ? 'Actief' : 'Uitgeschakeld'}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        toggleTimeTracking()
                    }}
                    className={cn(
                        'w-10 h-5 shrink-0 rounded-full relative transition-all duration-500 p-1 border border-white/10',
                        isTimeTracking ? 'bg-primary/20 shadow-[inset_0_0_10px_rgba(250,204,21,0.12)]' : 'bg-white/5 shadow-inner'
                    )}
                    title="Timing bijhouden in/uit"
                >
                    <div
                        className={cn(
                            'w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg',
                            isTimeTracking ? 'ml-auto bg-primary shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'mr-auto bg-white/20'
                        )}
                    />
                </button>
            </div>
            <div className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors border-t border-white/5">
                <div className="flex items-center gap-2 min-w-0 pr-2 text-left">
                    <FileText className={cn('w-3.5 h-3.5 text-primary shrink-0', !autoFollowScript && 'opacity-40')} />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Volg script</span>
                        <span className="text-[8px] opacity-40 uppercase font-bold text-white">
                            {autoFollowScript ? 'Automatisch' : 'Handmatig'}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        toggleAutoFollowScript()
                    }}
                    className={cn(
                        'w-10 h-5 shrink-0 rounded-full relative transition-all duration-500 p-1 border border-white/10',
                        autoFollowScript ? 'bg-primary/20 shadow-[inset_0_0_10px_rgba(250,204,21,0.12)]' : 'bg-white/5 shadow-inner'
                    )}
                    title="Script automatisch volgen in/uit"
                >
                    <div
                        className={cn(
                            'w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg',
                            autoFollowScript ? 'ml-auto bg-primary shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'mr-auto bg-white/20'
                        )}
                    />
                </button>
            </div>
        </>
    )
}

/**
 * Timing op de actieve overgangsbalk (show mode): `XX:xx / YY:yy`
 * — XX:xx: resterende tijd (aftellend naar 0) t.o.v. ingestelde of gemiddelde duur; zonder referentie: gelopen tijd.
 * — YY:yy: gemiddelde uit eerdere opnames (alleen als er samples zijn).
 */
const EventTransitionTimingFooter: React.FC<{
    triggerEvent: ShowEvent | null
    triggerType: string
    precedingGroupActive: boolean
    isPast?: boolean
    accent: 'yellow' | 'blue'
}> = ({ triggerEvent, triggerType, precedingGroupActive, isPast, accent }) => {
    const isTimeTracking = useSequencerStore(s => s.isTimeTracking)
    const lastTransitionTime = useSequencerStore(s => s.lastTransitionTime)
    const isPaused = useSequencerStore(s => s.isPaused)
    const pauseStartTime = useSequencerStore(s => s.pauseStartTime)
    const showTimingDurationsByKey = useSequencerStore(s => s.showTimingDurationsByKey)
    const [, setTick] = useState(0)
    useEffect(() => {
        const i = window.setInterval(() => setTick(t => t + 1), 500)
        return () => window.clearInterval(i)
    }, [])

    if (!triggerEvent || isPast || !precedingGroupActive || !isTimeTracking) return null

    const samples = getTransitionTimingSamples(triggerEvent, showTimingDurationsByKey)
    const n = samples.length
    const gemAvg = n ? Math.round(samples.reduce((a, b) => a + b, 0) / n) : null

    const elapsedSec = (() => {
        if (!lastTransitionTime || !precedingGroupActive) return 0
        if (isPaused) {
            return Math.round(((pauseStartTime || Date.now()) - lastTransitionTime) / 1000)
        }
        return Math.round((Date.now() - lastTransitionTime) / 1000)
    })()

    let referenceSec = 0
    if (triggerType === 'timed') referenceSec = triggerEvent.duration || 0
    else if ((triggerType === 'manual' || triggerType === 'media') && gemAvg) referenceSec = gemAvg

    const hasRef = referenceSec > 0 && !!lastTransitionTime
    const toGo =
        hasRef && precedingGroupActive && isTimeTracking
            ? Math.max(0, referenceSec - elapsedSec)
            : null

    /** Links: afteller naar 0 als er een referentie is; anders gelopen seconden in dit blok. */
    const leftSec = toGo !== null ? toGo : elapsedSec
    const showRight = n > 0 && gemAvg !== null

    if (leftSec === 0 && !showRight && !lastTransitionTime) return null

    const borderC = accent === 'blue' ? 'border-blue-400/35' : 'border-yellow-400/35'
    const leftClass =
        accent === 'blue'
            ? 'text-sky-50 font-black'
            : toGo !== null
              ? 'text-amber-50 font-black'
              : 'text-yellow-100/90 font-bold'

    return (
        <div className={cn('flex items-baseline justify-center gap-x-1 w-full border-t pt-2 mt-1 text-[10px] font-mono tabular-nums leading-none', borderC)}>
            <span className={leftClass}>{formatTime(leftSec)}</span>
            {showRight && (
                <>
                    <span className={accent === 'blue' ? 'text-sky-300/50' : 'text-yellow-200/45'}>/</span>
                    <span className={accent === 'blue' ? 'text-sky-100/80' : 'text-yellow-100/85'}>{formatTime(gemAvg!)}</span>
                </>
            )}
        </div>
    )
}

/** Parse "m:ss" or seconds string → seconds. */
const parseDurationInputToSec = (raw: string): number => {
    const t = raw.trim()
    if (!t) return 0
    const parts = t.split(':')
    if (parts.length === 1) {
        const n = parseInt(parts[0], 10)
        return Number.isFinite(n) ? Math.max(0, n) : 0
    }
    const m = parseInt(parts[0], 10) || 0
    const s = parseInt(parts[1], 10) || 0
    return Math.max(0, m * 60 + s)
}

const EventTransition: React.FC<{
    triggerEvent: ShowEvent | null
    isLastEvent: boolean
    isLocked: boolean
    /** Show mode: transition fully taken (we're past this block) */
    isPast?: boolean
    /** Show mode: the event card above this strip is the active group */
    precedingGroupActive?: boolean
    onEditTrigger?: (index?: number) => void
    triggerIndex?: number
}> = ({ triggerEvent, isLastEvent, isLocked, isPast, precedingGroupActive = false, onEditTrigger, triggerIndex }) => {
    if (!triggerEvent && isLastEvent) return null

    const triggerType = (triggerEvent?.effect || 'manual').toLowerCase()
    const cueText = triggerEvent?.cue || ''
    const isManualNoCue = !triggerEvent || (triggerType === 'manual' && !cueText)

    /** Alleen de overgang onder de actieve kaart is “live”; verderop: compacter, zonder tijdregel. */
    const stripMuted = !!(isLocked && !isPast && !precedingGroupActive)
    const showTimingFooter = !!(isLocked && precedingGroupActive && triggerEvent && !isPast)

    const canEdit = !isLocked && !!onEditTrigger

    const rowOuter = cn(
        'flex items-center group/trans',
        stripMuted ? 'gap-1.5 px-3 py-0.5 opacity-[0.78]' : 'gap-2 px-4 py-1',
        stripMuted && 'saturate-[0.92]',
        canEdit && 'cursor-pointer',
        isLocked && isPast && showModePastClass
    )
    const lineYellowSolid = stripMuted ? 'border-yellow-500/20' : 'border-yellow-500/40'
    const lineYellowDash = stripMuted ? 'border-yellow-500/16' : 'border-yellow-500/30'
    const lineBlueDash = stripMuted ? 'border-blue-500/18' : 'border-blue-500/30'

    const yellowPanel = cn(
        'flex flex-col rounded-lg border transition-colors',
        stripMuted
            ? 'min-w-0 max-w-[min(320px,85vw)] px-2.5 py-1 gap-0 bg-yellow-500/[0.06] border-yellow-500/28 text-[9px] text-yellow-200/75'
            : 'min-w-[min(420px,92vw)] max-w-[min(520px,calc(100vw-5rem))] px-4 py-2 gap-1 bg-yellow-500/15 border-yellow-500/50 text-[10px] text-yellow-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] group-hover/trans:bg-yellow-500/22'
    )
    const yellowPanelDashed = cn(
        yellowPanel,
        !stripMuted && 'bg-yellow-500/12 border-yellow-500/35 group-hover/trans:bg-yellow-500/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    )
    const bluePanel = cn(
        'flex flex-col rounded-lg border transition-colors',
        stripMuted
            ? 'min-w-0 max-w-[min(320px,85vw)] px-2.5 py-1 gap-0 bg-blue-500/[0.06] border-blue-500/28 text-[9px] text-sky-200/75'
            : 'min-w-[min(420px,92vw)] max-w-[min(520px,calc(100vw-5rem))] px-4 py-2 gap-1 bg-blue-500/12 border-blue-500/35 text-[10px] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] group-hover/trans:bg-blue-500/18'
    )

    const iconSm = stripMuted ? 'w-3 h-3' : 'w-3.5 h-3.5'
    const labelWeight = stripMuted ? 'font-semibold' : 'font-bold'

    if (isManualNoCue) {
        const label = cueText || 'Handmatige overgang'
        return (
            <div
                className={rowOuter}
                onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
            >
                <div className={cn('flex-1 border-t', lineYellowSolid)} />
                <div className={yellowPanel}>
                    <div className={cn('flex items-center gap-2 min-w-0', labelWeight)}>
                        <Zap className={cn(iconSm, 'text-yellow-400/90 shrink-0')} />
                        <span className="truncate">{label}</span>
                    </div>
                    {showTimingFooter && (
                        <EventTransitionTimingFooter
                            triggerEvent={triggerEvent}
                            triggerType="manual"
                            precedingGroupActive={precedingGroupActive}
                            isPast={isPast}
                            accent="yellow"
                        />
                    )}
                </div>
                <div className={cn('flex-1 border-t', lineYellowSolid)} />
            </div>
        )
    }

    if (triggerType === 'timed') {
        const duration = triggerEvent?.duration || 0
        const mins = Math.floor(duration / 60)
        const secs = (duration % 60).toString().padStart(2, '0')
        return (
            <div
                className={rowOuter}
                onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
            >
                <div className={cn('flex-1 border-t border-dashed', lineYellowDash)} />
                <div className={yellowPanelDashed}>
                    <div className={cn('flex items-center gap-2 min-w-0 text-yellow-200', labelWeight)}>
                        <Clock className={cn(iconSm, 'text-yellow-400 shrink-0')} />
                        <span>
                            Automatisch na {mins}:{secs}
                        </span>
                    </div>
                    {showTimingFooter && (
                        <EventTransitionTimingFooter
                            triggerEvent={triggerEvent}
                            triggerType="timed"
                            precedingGroupActive={precedingGroupActive}
                            isPast={isPast}
                            accent="yellow"
                        />
                    )}
                </div>
                <div className={cn('flex-1 border-t border-dashed', lineYellowDash)} />
            </div>
        )
    }

    if (triggerType === 'media') {
        const mediaName = triggerEvent?.mediaTriggerId
            ? triggerEvent.mediaTriggerId.split('|')[0]?.split(/[/\\]/).pop() || 'media'
            : 'media afgerond'
        return (
            <div
                className={rowOuter}
                onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
            >
                <div className={cn('flex-1 border-t border-dashed', lineBlueDash)} />
                <div className={bluePanel}>
                    <div className={cn('flex items-center gap-2 min-w-0 text-sky-200', labelWeight)}>
                        <SkipForward className={cn(iconSm, 'text-sky-400 shrink-0')} />
                        <span className="truncate">Na: {mediaName}</span>
                    </div>
                    {showTimingFooter && (
                        <EventTransitionTimingFooter
                            triggerEvent={triggerEvent}
                            triggerType="media"
                            precedingGroupActive={precedingGroupActive}
                            isPast={isPast}
                            accent="blue"
                        />
                    )}
                </div>
                <div className={cn('flex-1 border-t border-dashed', lineBlueDash)} />
            </div>
        )
    }

    return (
        <div
            className={rowOuter}
            onClick={canEdit ? (e) => { e.stopPropagation(); onEditTrigger?.(triggerIndex) } : undefined}
        >
            <div className={cn('flex-1 border-t', lineYellowSolid)} />
            <div className={yellowPanel}>
                <div className={cn('flex items-center gap-2 min-w-0', labelWeight)}>
                    <Zap className={cn(iconSm, 'text-yellow-400 shrink-0')} />
                    <span className="truncate">{cueText}</span>
                </div>
                {showTimingFooter && (
                    <EventTransitionTimingFooter
                        triggerEvent={triggerEvent}
                        triggerType="manual"
                        precedingGroupActive={precedingGroupActive}
                        isPast={isPast}
                        accent="yellow"
                    />
                )}
            </div>
            <div className={cn('flex-1 border-t', lineYellowSolid)} />
        </div>
    )
}

const TransitionEditModal: React.FC<{
    triggerIndex: number
    onClose: () => void
}> = ({ triggerIndex, onClose }) => {
    const updateEvent = useSequencerStore(s => s.updateEvent)
    const events = useSequencerStore(s => s.events)
    const activeShow = useSequencerStore(s => s.activeShow)
    const showTimingDurationsByKey = useSequencerStore(s => s.showTimingDurationsByKey)
    const clearTransitionTimingData = useSequencerStore(s => s.clearTransitionTimingData)
    const setTransitionTimingReferenceSec = useSequencerStore(s => s.setTransitionTimingReferenceSec)
    const [correctOpen, setCorrectOpen] = useState(false)
    const [correctInput, setCorrectInput] = useState('')
    const [editEffect, setEditEffect] = useState('manual')
    const [editCue, setEditCue] = useState('')
    const [editDurationStr, setEditDurationStr] = useState('0:00')
    const [editMediaTriggerId, setEditMediaTriggerId] = useState('')

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
        const row = events[triggerIndex]
        if (!row) return
        const eff = (row.effect || 'manual').toLowerCase()
        setEditEffect(eff)
        setEditCue(row.cue || '')
        const d = row.duration || 0
        setEditDurationStr(`${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`)
        setEditMediaTriggerId(row.mediaTriggerId || '')
    }, [
        triggerIndex,
        events,
        events[triggerIndex]?.effect,
        events[triggerIndex]?.cue,
        events[triggerIndex]?.duration,
        events[triggerIndex]?.mediaTriggerId
    ])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    const showLabel = activeShow?.name?.trim() || 'Script / show'
    const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1'
    const inputCls =
        'w-full rounded-lg bg-[#13131a] border border-white/18 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/45'

    const handleSave = () => {
        if (!trigger) return
        const eff = editEffect.toLowerCase()
        const parts = editDurationStr.split(':')
        const m = parseInt(parts[0], 10) || 0
        const s = parseInt(parts[1], 10) || 0
        const durationSec = m * 60 + s
        updateEvent(triggerIndex, {
            effect: eff,
            cue: editCue.trim(),
            duration: eff === 'timed' ? durationSec : 0,
            mediaTriggerId: eff === 'media' ? (editMediaTriggerId || undefined) : undefined
        })
        onClose()
    }

    if (!trigger) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="flex max-h-[90vh] min-h-0 w-full max-w-lg flex-col rounded-xl border border-white/15 bg-[#1e1e24] shadow-2xl p-5 w-[min(560px,calc(100vw-32px))]"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between shrink-0 gap-3 mb-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-primary">Overgang bewerken</h2>
                    <button type="button" onClick={onClose} className={modalHeaderCloseBtn()} title="Sluiten">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="text-[11px] text-white/50 mb-4 leading-relaxed shrink-0">
                    Onderdeel van <span className="font-semibold text-white/80">{trigger.act}</span>
                    {' · '}
                    Scene <span className="font-mono text-white/75">{trigger.sceneId}</span>, Event{' '}
                    <span className="font-mono text-white/75">{trigger.eventId}</span>
                    <br />
                    <span className="text-white/45">Script / show:</span> <span className="text-white/70">{showLabel}</span>
                </p>

                <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto pr-1 max-h-[min(70vh,520px)]">
                    <div>
                        <label className={labelCls}>Type overgang</label>
                        <select
                            title="Trigger type"
                            className={inputCls}
                            value={editEffect}
                            onChange={(e) => setEditEffect(e.target.value)}
                        >
                            <option value="manual">Handmatige overgang</option>
                            <option value="timed">Timed (auto-trigger)</option>
                            <option value="media">Media afgerond</option>
                        </select>
                    </div>

                    {editEffect === 'manual' && (
                        <div>
                            <label className={labelCls}>Cue / omschrijving</label>
                            <input
                                autoFocus
                                value={editCue}
                                onChange={(e) => setEditCue(e.target.value)}
                                className={inputCls}
                                placeholder="Trigger of korte omschriving…"
                            />
                        </div>
                    )}

                    {editEffect === 'timed' && (
                        <div>
                            <label className={labelCls}>Vertraging (mm:ss)</label>
                            <input
                                autoFocus
                                value={editDurationStr}
                                onChange={(e) => setEditDurationStr(e.target.value)}
                                className={cn(inputCls, 'font-mono text-center max-w-[8rem]')}
                                placeholder="M:SS"
                            />
                        </div>
                    )}

                    {editEffect === 'media' && (
                        <div>
                            <label className={labelCls}>Media-trigger</label>
                            {siblingMedia.length > 0 ? (
                                <select
                                    title="Media kiezen"
                                    className={inputCls}
                                    value={editMediaTriggerId}
                                    onChange={(e) => setEditMediaTriggerId(e.target.value)}
                                >
                                    <option value="">Kies mediabron in dit event…</option>
                                    {siblingMedia.map((medi, idx) => {
                                        const mediaId = `${medi.filename}|${medi.fixture}`
                                        const name = medi.filename?.split(/[\\/]/).pop() || 'Onbekende media'
                                        return (
                                            <option key={idx} value={mediaId}>
                                                {name}{medi.fixture ? ` (${medi.fixture})` : ''}
                                            </option>
                                        )
                                    })}
                                </select>
                            ) : (
                                <div className={cn(inputCls, 'flex items-center gap-2 text-red-300 border-red-500/30 bg-red-500/10')}>
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span className="text-xs">Geen mediaregel in dit event</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {(() => {
                    const samples = getTransitionTimingSamples(trigger, showTimingDurationsByKey)
                    if (samples.length === 0) return null

                    const n = samples.length
                    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / n)
                    const listStr = samples.map(s => formatTime(s)).join(' · ')

                    const onWissen = async (e: React.MouseEvent) => {
                        e.stopPropagation()
                        if (
                            !confirm(
                                'Alle geregistreerde tijden voor deze overgang wissen? (database en sequence)'
                            )
                        )
                            return
                        await clearTransitionTimingData(triggerIndex)
                        setCorrectOpen(false)
                    }

                    const onApplyCorrect = async (e: React.MouseEvent) => {
                        e.stopPropagation()
                        const sec = parseDurationInputToSec(correctInput)
                        await setTransitionTimingReferenceSec(triggerIndex, sec)
                        setCorrectOpen(false)
                    }

                    return (
                        <div className="mt-3 border-t border-white/15 pt-3">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Geregistreerde Tijden</span>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-white/50">Gemiddeld:</span>
                                        <span className="text-sm font-bold text-amber-50 font-mono">{formatTime(avg)}</span>
                                    </div>
                                    {n === 1 ? (
                                        <span className="text-[9px] text-white/40">1 meting</span>
                                    ) : (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-white/40">{n} metingen</span>
                                            <span className="text-[9px] text-white/30 font-mono" title={listStr}>
                                                {listStr}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <button
                                        type="button"
                                        className="text-[9px] font-bold uppercase tracking-wide px-3 py-1 rounded border border-yellow-500/35 text-yellow-100/95 hover:bg-yellow-500/15 transition-colors"
                                        title="Alle metingen verwijderen"
                                        onClick={onWissen}
                                    >
                                        Wissen
                                    </button>
                                    <button
                                        type="button"
                                        className="text-[9px] font-bold uppercase tracking-wide px-3 py-1 rounded border border-yellow-500/35 text-yellow-100/95 hover:bg-yellow-500/15 transition-colors"
                                        title="Vervang met één referentietijd (wist oude metingen)"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setCorrectInput(formatTime(avg))
                                            setCorrectOpen(true)
                                        }}
                                    >
                                        Gemiddelde Corrigeren
                                    </button>
                                </div>
                                {correctOpen && (
                                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
                                        <span className="text-[9px] text-white/50 text-center">
                                            Nieuwe referentie (m:ss of seconden). Leeg = 0 (wissen).
                                        </span>
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="text"
                                                value={correctInput}
                                                onChange={ev => setCorrectInput(ev.target.value)}
                                                className="w-24 bg-black/35 border border-yellow-500/30 text-yellow-50 rounded px-2 py-1 text-[11px] font-mono text-center outline-none focus:border-white/25"
                                                onClick={e => e.stopPropagation()}
                                                onKeyDown={e => e.stopPropagation()}
                                            />
                                            <button
                                                type="button"
                                                className="text-[9px] font-bold uppercase px-3 py-1 rounded border border-yellow-500/35 text-yellow-100/95 hover:bg-yellow-500/15 transition-colors"
                                                onClick={onApplyCorrect}
                                            >
                                                Opslaan
                                            </button>
                                            <button
                                                type="button"
                                                className="text-[9px] font-bold uppercase px-3 py-1 rounded border border-white/15 text-white/60 hover:bg-white/10"
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    setCorrectOpen(false)
                                                }}
                                            >
                                                Annuleren
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })()}

                <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-white/15 pt-3">
                    <button type="button" onClick={onClose} className={modalBtnSecondary('px-3')}>
                        <X className={modalBtnIconClass} />
                        Annuleren
                    </button>
                    <button type="button" onClick={handleSave} className={modalBtnPrimary('px-4')}>
                        <Save className="h-4 w-4 shrink-0 text-white" />
                        Opslaan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

type EvRow = { event: ShowEvent; originalIndex: number }

function isFirstLightRowForFixtureInEvent(
    eventRows: EvRow[],
    fixture: string | undefined,
    thisOriginalIndex: number
): boolean {
    if (!fixture) return true
    const same = eventRows.filter(
        r => r.event.type?.toLowerCase() === 'light' && r.event.fixture === fixture
    )
    if (same.length === 0) return true
    return same[0].originalIndex === thisOriginalIndex
}

/** Show-modus: alleen de eerste WLED-regel per fixture in het actieve event krijgt live peek. */
function wledPeekPlaceholderForRow(
    isLocked: boolean,
    eventNode: { isActive: boolean; rows: EvRow[] },
    event: ShowEvent,
    originalIndex: number,
    devices: Device[]
): boolean {
    if (!isLocked) return false
    const t = event.type?.toLowerCase()
    if (t !== 'light' || !event.fixture) return false
    const d = devices.find(x => x.name === event.fixture)
    if (d?.type !== 'wled') return false
    const first = isFirstLightRowForFixtureInEvent(eventNode.rows, event.fixture, originalIndex)
    return !eventNode.isActive || !first
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
    onRequestEditRow: (index: number) => void
    isRowSelected: boolean
    menuOpenIndex: number | string | null
    setMenuOpenIndex: (index: number | string | null) => void
    isLocked: boolean
    activeEventIndex: number
    eventStatuses: any
    selectedEventIndex: number
    selectedEvent: ShowEvent | null
    ongoingEffects?: { type: 'media' | 'light', id: string }[]
    /** Show-modus: geen WS/live strip voor WLED (zwarte balk, alleen titel). */
    wledPeekPlaceholder?: boolean
    /** Show mode: slim projector/videowall row (no full preview strip). */
    showModeMediaCompact?: boolean
    /** Edit-modus + show-instelling: ⋮ verbergen, grip tonen. */
    sequenceReorderMode?: boolean
    /** Alleen action-regels: sleep binnen hetzelfde event. */
    actionRowDnD?: ActionRowDnDProps
}> = ({
    event, originalIndex, id, isShadow, isActiveGroup, isNextGroup, handleRowClick, handleRowDoubleClick,
    onRequestEditRow, isRowSelected, menuOpenIndex, setMenuOpenIndex, isLocked,
    activeEventIndex, eventStatuses, selectedEventIndex: _selIdx, selectedEvent: _selEv, ongoingEffects, zebraIndex,
    wledPeekPlaceholder = false,
    showModeMediaCompact = false,
    sequenceReorderMode = false,
    actionRowDnD,
}) => {
        const [currentTime, setCurrentTime] = useState(new Date())
        const menuButtonRef = useRef<HTMLButtonElement>(null)

        useEffect(() => {
            const t = setInterval(() => setCurrentTime(new Date()), 1000)
            return () => clearInterval(t)
        }, [])

        const isTimeTracking = useSequencerStore(s => s.isTimeTracking)
        const lastTransitionTime = useSequencerStore(s => s.lastTransitionTime)
        const showTimingDurationsByKey = useSequencerStore(s => s.showTimingDurationsByKey)

        // Actions
        const updateEvent = useSequencerStore(s => s.updateEvent)
        const deleteEvent = useSequencerStore(s => s.deleteEvent)
        const addToast = useSequencerStore(s => s.addToast)
        const resendEvent = useSequencerStore(s => s.resendEvent)
        const renameAct = useSequencerStore(s => s.renameAct)
        const renameScene = useSequencerStore(s => s.renameScene)
        const insertAct = useSequencerStore(s => s.insertAct)
        const insertScene = useSequencerStore(s => s.insertScene)
        const insertEvent = useSequencerStore(s => s.insertEvent)
        const addEventAbove = useSequencerStore(s => s.addEventAbove)
        const addEventBelow = useSequencerStore(s => s.addEventBelow)
        const restartMedia = useSequencerStore(s => s.restartMedia)
        const stopMedia = useSequencerStore(s => s.stopMedia)
        const pauseMedia = useSequencerStore(s => s.pauseMedia)
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

        const previewShouldLoop = type === 'media' && event.effect === 'repeat'

        // Sync Playback for Active or Manually Playing Row (must match ProjectionWindow loop / no loop)
        useEffect(() => {
            if (!videoRef.current) return
            const el = videoRef.current
            el.loop = previewShouldLoop
            if (isActuallyPlaying) {
                // Try to sync with lastTransitionTime if it's the sequence-active row
                if (isRowActive && lastTransitionTime) {
                    const diff = (Date.now() - lastTransitionTime) / 1000
                    if (diff > 0.1 && diff < 3600 && Math.abs(el.currentTime - diff) > 1) {
                        el.currentTime = diff
                    }
                }
                // Calling play() on an ended element restarts from 0 — avoid that when repeat is off (same as main output).
                if (!previewShouldLoop && el.ended) {
                    return
                }
                el.play().catch(e => console.warn('Preview play failed', e))
            } else {
                el.pause()
                el.currentTime = 0
            }
        }, [isActuallyPlaying, isRowActive, lastTransitionTime, previewShouldLoop])

        if (!event) return null

        const isDefaultComment = type === 'comment' && (
            !event.cue ||
            event.cue === 'Nieuw commentaar' ||
            event.cue === 'Opmerkingen' ||
            event.cue === 'Opmerking'
        );
        // Hide placeholder comments in show mode only (edit mode shows stable placeholder rows).
        if (type === 'comment' && isDefaultComment && isLocked) return null;

        const zebraClass = !isShadow && zebraIndex !== undefined
            ? (zebraIndex % 2 === 0 ? "bg-white/[0.04]" : "bg-white/[0.08]")
            : null

        return (
            <div
                data-row-id={id}
                onClick={() => !isShadow && handleRowClick(originalIndex)}
                onDoubleClick={() => !isShadow && handleRowDoubleClick(originalIndex)}
                onDragOver={actionRowDnD?.onRowDragOver}
                onDragLeave={actionRowDnD?.onRowDragLeave}
                onDrop={actionRowDnD?.onRowDrop}
                className={cn(
                    "group/row relative flex items-center px-4 py-2 transition-all border-l-2",
                    isShadow ? "cursor-default opacity-50 grayscale bg-white/5 border-l-dashed border-l-primary/30" : "cursor-pointer",
                    actionRowDnD && actionRowDnD.seqDndSourceKey === actionRowDnD.rowKey && 'opacity-45',
                    !isShadow && zebraClass,
                    isLocked && isRowActive ? "bg-green-500/20 border-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]" : "border-transparent hover:bg-white/5",
                    isRowSelected && !isRowActive && !isShadow && "ring-1 ring-inset ring-blue-500/35 bg-blue-500/[0.06]",
                    isLocked && isActiveGroup && !isRowActive && "border-l-green-500/30",
                    isLocked && isNextGroup && !isRowActive && "border-l-orange-500/30",
                    type === 'comment' && "opacity-60 italic text-[11px]",
                    type === 'action' && 'border-l-yellow-500 text-yellow-100',
                    type === 'light' && "border-l-purple-500/50",
                    type === 'media' && "border-l-blue-500/40",
                    type === 'trigger' && "opacity-40 text-[10px] font-mono",
                    isShadow && "shadow-none hover:bg-white/5"
                )}
            >
                {actionRowDnD && actionRowDnD.seqDndHover?.targetKey === actionRowDnD.rowKey && actionRowDnD.seqDndHover.edge === 'before' && (
                    <div className={cn(TREE_DROP_LINE, 'top-0')} aria-hidden />
                )}
                {actionRowDnD && actionRowDnD.seqDndHover?.targetKey === actionRowDnD.rowKey && actionRowDnD.seqDndHover.edge === 'after' && (
                    <div className={cn(TREE_DROP_LINE, 'bottom-0')} aria-hidden />
                )}
                {/* Visual Indicators for Ongoing Effects (Persistence lines) */}
                {ongoingEffects && ongoingEffects.length > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 flex gap-px ml-0.5 pointer-events-none">
                        {ongoingEffects.map((eff, i) => (
                            <div
                                key={`${eff.id ?? 'eff'}-${i}`}
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
                            {type === 'light' && !isShadow && event.fixture && (
                                <LightFixtureStripPreview
                                    event={event}
                                    compact
                                    showModeStrip={isLocked}
                                    wledPeekPlaceholder={wledPeekPlaceholder}
                                />
                            )}
                            <div className="flex items-center justify-between gap-4">
                                <div className={cn("text-xs flex items-center gap-2", type === 'action' && !isLocked && "font-black uppercase tracking-wider", type === 'title' && "text-sm font-semibold text-orange-400", type !== 'comment' && type !== 'action' && "truncate")}>
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
                                                    <Zap className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Handmatige overgang ({event.cue || 'Geen cue'})</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : type === 'action' ? (
                                        <div className="flex flex-col gap-1 w-full min-w-0">
                                            <div className="flex items-start gap-2 w-full min-w-0">
                                                {isLocked && !isShadow && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            updateEvent(originalIndex, { actionCompleted: !event.actionCompleted })
                                                        }}
                                                        title={event.actionCompleted ? 'Markeren als niet gedaan' : 'Afvinken'}
                                                        className="mt-0.5 shrink-0 rounded border border-white/20 p-0.5 hover:bg-white/10 text-green-400"
                                                    >
                                                        {event.actionCompleted ? (
                                                            <Check className="w-4 h-4" />
                                                        ) : (
                                                            <span className="block w-4 h-4 rounded-sm border border-white/40" />
                                                        )}
                                                    </button>
                                                )}
                                                <div
                                                    className={cn(
                                                        'flex-1 min-w-0',
                                                        isLocked && event.actionCompleted && 'line-through opacity-55'
                                                    )}
                                                >
                                                    <span className={cn(!isLocked && 'font-black uppercase tracking-wider')}>
                                                        {event.cue}
                                                    </span>
                                                    {(event.actionCueMoment ||
                                                        event.actionAssignee ||
                                                        event.duration ||
                                                        event.scriptPg) && (
                                                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-normal normal-case opacity-70">
                                                            {event.actionCueMoment ? (
                                                                <span title="Moment">Moment: {event.actionCueMoment}</span>
                                                            ) : null}
                                                            {event.actionAssignee ? (
                                                                <span title="Wie">Wie: {event.actionAssignee}</span>
                                                            ) : null}
                                                            {(event.duration || 0) > 0 ? (
                                                                <span title="Tijdsbudget">Tijd: {formatTime(event.duration || 0)}</span>
                                                            ) : null}
                                                            {event.scriptPg ? (
                                                                <span title="Script">Pg {event.scriptPg}</span>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        event.cue
                                    )}
                                    {type === 'media' && event.filename && !showModeMediaCompact && (
                                        <span className="text-[9px] opacity-40 font-mono bg-white/5 px-1 rounded truncate max-w-[300px]" title={event.filename}>{event.filename}</span>
                                    )}
                                    {type === 'light' && (
                                        <div className="flex gap-2 items-center">
                                            {(() => {
                                                const ld = event.fixture
                                                    ? getDevices().find(d => d.name === event.fixture)
                                                    : undefined
                                                const hideFixtureChip = ld?.type === 'wled' || ld?.type === 'wiz'
                                                if (hideFixtureChip) return null
                                                return (
                                                    <span className="text-[9px] opacity-40 font-mono bg-white/5 px-1 rounded">
                                                        {event.fixture || 'Geen Lamp'}
                                                    </span>
                                                )
                                            })()}
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
                                    {!isLocked && (
                                        type === 'trigger'
                                            ? (isTimeTracking || getTransitionTimingSamples(event, showTimingDurationsByKey).length > 0 || (event.effect?.toLowerCase() === 'timed' && (event.duration || 0) > 0))
                                            : (isTimeTracking || (event.duration && event.duration > 0))
                                    ) && (
                                        <div className={cn(
                                            "font-mono text-[10px] px-1.5 py-0.5 rounded flex flex-col items-center justify-center gap-0 min-w-[52px] tabular-nums leading-tight",
                                            isRowActive ? "text-yellow-400 font-bold bg-yellow-500/10 border border-yellow-500/20" : "opacity-40 text-muted-foreground bg-white/5"
                                        )}>
                                            {type === 'trigger' ? (() => {
                                                const samples = getTransitionTimingSamples(event, showTimingDurationsByKey)
                                                const avg = samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : 0
                                                const elapsed = Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000)
                                                const eff = event.effect?.toLowerCase() || ''
                                                if (eff === 'timed' && (event.duration || 0) > 0) {
                                                    const rem = Math.max(0, (event.duration || 0) - (isRowActive && isTimeTracking ? elapsed : 0))
                                                    return (
                                                        <>
                                                            <span>{isRowActive && isTimeTracking ? formatTime(rem) : formatTime(event.duration || 0)}</span>
                                                            {samples.length > 0 && (
                                                                <span className="text-[8px] opacity-70">gem. {formatTime(avg)} · {samples.length}×</span>
                                                            )}
                                                        </>
                                                    )
                                                }
                                                if (isRowActive && isTimeTracking) {
                                                    return (
                                                        <>
                                                            <span>{formatTime(elapsed)}</span>
                                                            {samples.length > 0 && (
                                                                <span className="text-[8px] opacity-70">gem. {formatTime(avg)} · {samples.length}×</span>
                                                            )}
                                                        </>
                                                    )
                                                }
                                                if (samples.length > 0) {
                                                    return (
                                                        <>
                                                            <span>gem. {formatTime(avg)}</span>
                                                            <span className="text-[8px] opacity-70">{samples.length} metingen</span>
                                                        </>
                                                    )
                                                }
                                                return <span>0:00</span>
                                            })() : (
                                                <>
                                                    {(event.duration || 0) > 0 ? (isRowActive && isTimeTracking ? Math.floor(Math.max(0, (event.duration || 0) - Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000)) / 60) + ':' + (Math.max(0, (event.duration || 0) - Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000)) % 60).toString().padStart(2, '0') : Math.floor((event.duration || 0) / 60) + ':' + ((event.duration || 0) % 60).toString().padStart(2, '0')) : (isRowActive && isTimeTracking ? Math.floor(Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000) / 60) + ':' + (Math.round(((currentTime?.getTime() || 0) - (lastTransitionTime || (currentTime?.getTime() || 0))) / 1000) % 60).toString().padStart(2, '0') : '0:00')}
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {type === 'title' && event.scriptPg !== undefined && event.scriptPg > 0 && <div className="text-[10px] font-mono opacity-40 bg-white/5 px-1.5 rounded flex items-center justify-center min-w-[32px]">Pg {event.scriptPg}</div>}
                                </div>
                            </div>
                            {(type !== 'media' && type !== 'action' && type !== 'light' && event.fixture) &&
                                (type !== 'title' && type !== 'comment') && (
                                    <div className="text-[10px] opacity-40 truncate">
                                        {event.fixture} {event.effect ? `• ${event.effect}` : ''}
                                    </div>
                                )}

                    {type === 'media' && isLocked && (showModeMediaCompact ? (
                        <div
                            className="flex items-center gap-2 mt-1.5 py-1.5 px-2 bg-black/30 rounded border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            {event.filename && (() => {
                                const isPortrait = event.fixture && getDevices().find(d => d.name === event.fixture)?.type === 'videowall_agent' && (getDevices().find(d => d.name === event.fixture) as any)?.orientation === 'portrait'
                                return (
                                    <div className={cn(
                                        'w-24 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group/preview-compact',
                                        isPortrait ? 'aspect-[9/16]' : 'aspect-video'
                                    )}>
                                        <div className={cn(
                                            'absolute',
                                            isPortrait ? 'top-1/2 left-1/2' : 'inset-0'
                                        )} style={isPortrait ? { width: '177.77%', height: '56.25%', transform: 'translate(-50%, -50%) rotate(-90deg)' } : undefined}>
                                            <video
                                                ref={videoRef}
                                                src={getMediaUrlWithContext(event.filename)}
                                                className="w-full h-full object-cover"
                                                muted
                                                loop={previewShouldLoop}
                                                onTimeUpdate={(e) => {
                                                    const v = e.currentTarget
                                                    if (v.duration) {
                                                        setVideoTimes({ current: Math.floor(v.currentTime), total: Math.floor(v.duration) })
                                                    }
                                                }}
                                                onLoadedMetadata={(e) => {
                                                    const v = e.currentTarget
                                                    setVideoTimes({ current: 0, total: Math.floor(v.duration) })
                                                }}
                                            />
                                        </div>
                                        {event.fixture && getDevices().find((d: Device) => d.name === event.fixture)?.type === 'videowall_agent' && (
                                            <VideoWallPreviewOverlay
                                                layout={(getDevices().find((d: Device) => d.name === event.fixture) as any)?.layout || '1x1'}
                                                bezelSize={(getDevices().find((d: Device) => d.name === event.fixture) as any)?.bezelSize}
                                            />
                                        )}
                                    </div>
                                )
                            })()}
                            <Monitor className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] font-semibold text-white/90 truncate">{event.fixture || 'Scherm'}</span>
                                    {isActuallyPlaying && isLocked && (
                                        <span className="text-[7px] font-black uppercase px-1 py-px rounded bg-red-500 text-white animate-pulse shrink-0">Live</span>
                                    )}
                                </div>
                                <div className="text-[9px] text-white/45 truncate font-mono">{event.filename ? event.filename.split(/[\\/]/).pop() : '—'}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); restartMedia(originalIndex); }} className="p-1.5 bg-green-500 text-black rounded-full hover:bg-green-400 transition-colors" title="Start / Play"><Play className="w-3 h-3 fill-black" /></button>
                                <button onClick={(e) => { e.stopPropagation(); pauseMedia(originalIndex); }} className="p-1.5 bg-white/10 hover:bg-amber-500/80 hover:text-white rounded-full transition-colors" title="Pauze"><Pause className="w-3 h-3 fill-current" /></button>
                                <button onClick={(e) => { e.stopPropagation(); stopMedia(originalIndex); }} className="p-1.5 bg-white/10 hover:bg-red-500 hover:text-white rounded-full transition-colors" title="Stop"><Square className="w-3 h-3 fill-current" /></button>
                                <button onClick={(e) => { e.stopPropagation(); toggleAudio(originalIndex) }} className={cn('p-1 rounded transition-colors', event.sound ? 'bg-white/10 text-white' : 'bg-red-500/15 text-red-400')} title="Mute/Unmute">{!event.sound ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}</button>
                                {(() => {
                                    const targetDev = event.fixture ? getDevices().find(d => d.name === event.fixture) : null
                                    if (!targetDev) return null
                                    const transfer = Object.values(useSequencerStore.getState().activeTransfers).find(t => t.deviceId === targetDev.id)
                                    if (!transfer) return null
                                    const statusLabel = transfer.status === 'checking' ? '⏳' : transfer.status === 'uploading' ? `⬆${transfer.percent}%` : transfer.status === 'complete' ? '✅' : transfer.status === 'skipped' ? '✓' : '❌'
                                    return (
                                        <div className="flex items-center px-1 py-0.5 bg-amber-500/10 border border-amber-500/25 rounded text-[8px] font-bold text-amber-300">
                                            {statusLabel}
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 mt-2 bg-black/20 p-2 rounded border border-white/5">
                            <div className="text-[9px] opacity-40 truncate flex flex-col gap-0.5 w-24">
                                <div className="font-bold uppercase tracking-wider">Output</div>
                                <div className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {event.fixture || 'Alle'}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-center">
                                <button onClick={(e) => { e.stopPropagation(); restartMedia(originalIndex); }} className="p-2 bg-green-500 text-black rounded-full hover:bg-green-400 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.3)]" title="Start / Play"><Play className="w-3 h-3 fill-black" /></button>
                                <button onClick={(e) => { e.stopPropagation(); pauseMedia(originalIndex); }} className="p-2 bg-white/10 hover:bg-amber-500/80 hover:text-white rounded-full transition-colors" title="Pauze"><Pause className="w-3 h-3 fill-current" /></button>
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
                                                loop={previewShouldLoop}
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
                    ))}
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

                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    {isShadow ? null : (
                        <>
                            {!isLocked && (type === 'comment' || type === 'title') && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onRequestEditRow(originalIndex) }}
                                    title="Bewerken in venster"
                                    className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-primary"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <div className="relative flex items-center">
                                {!sequenceReorderMode && (!isLocked || type === 'light' || type === 'media') ? (
                                    <>
                                        <button
                                            ref={menuButtonRef}
                                            onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === originalIndex ? null : originalIndex) }}
                                            title="Context Menu"
                                            className="p-1 hover:bg-white/10 rounded"
                                        >
                                            <MoreVertical className="w-3.5 h-3.5" />
                                        </button>
                                        {menuOpenIndex === originalIndex && (
                                            <ContextMenu
                                                index={originalIndex}
                                                event={event}
                                                type={type}
                                                isLocked={isLocked}
                                                onClose={() => setMenuOpenIndex(null)}
                                                anchorRect={menuButtonRef.current?.getBoundingClientRect() || undefined}
                                                handlers={{
                                                    openRowEdit: onRequestEditRow,
                                                    resendEvent, renameAct, renameScene,
                                                    insertAct, insertScene, insertEvent, addEventAbove, addEventBelow, addCommentToEvent, handleDelete,
                                                    restartMedia, pauseMedia, stopMedia, toggleAudio, toggleRepeat, copyToClipboard, loadClipboard,
                                                    pasteFromClipboard
                                                }}
                                                clipboard={clipboard}
                                            />
                                        )}
                                    </>
                                ) : null}
                                {!isLocked && sequenceReorderMode && !isShadow && actionRowDnD ? (
                                    <span
                                        data-seq-dnd-grip
                                        role="button"
                                        tabIndex={0}
                                        draggable
                                        className={cn(SEQUENCE_TREE_DRAG_GRIP, 'opacity-100')}
                                        title="Action slepen — alleen binnen dit event"
                                        onClick={e => e.stopPropagation()}
                                        onKeyDown={e => e.stopPropagation()}
                                        onDragStart={actionRowDnD.onGripDragStart}
                                        onDragEnd={actionRowDnD.onGripDragEnd}
                                    >
                                        <GripVertical className="h-3.5 w-3.5" />
                                    </span>
                                ) : null}
                                {!isLocked && sequenceReorderMode && !isShadow && !actionRowDnD ? (
                                    <span
                                        className={cn(SEQUENCE_TREE_DRAG_GRIP, 'opacity-95')}
                                        title="Sleep Act-, Scene- of Event-groepen via de grip op die regels"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <GripVertical className="h-3.5 w-3.5" />
                                    </span>
                                ) : null}
                            </div>
                        </>
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
                        const firstIdx =
                            act.actLevelRows?.[0]?.originalIndex ??
                            act.scenes[0]?.events[0]?.rows[0]?.originalIndex ??
                            0
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
        openRowEdit: (i: number) => void
        resendEvent: (i: number) => void
        renameAct: (oldName: string, newName: string) => void
        renameScene: (actName: string, sceneId: number, newDescription: string) => void
        insertAct: (i: number, p: 'before' | 'after') => void
        insertScene: (i: number, p: 'before' | 'after') => void
        insertEvent: (i: number, p: 'before' | 'after') => void
        addEventAbove: (i: number, type?: string, cue?: string) => void
        addEventBelow: (i: number, type?: string, cue?: string) => void
        addCommentToEvent: (index: number) => void
        handleDelete: (i: number, e: ShowEvent) => void
        restartMedia: (i: number) => void
        pauseMedia: (i: number) => void
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
                <button onClick={() => { handlers.openRowEdit(index); onClose(); }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2">
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
                                    handlers.addEventBelow(index, 'Light', 'Licht');
                                    useSequencerStore.getState().addToast('Licht toegevoegd. Vouw het event uit of gebruik Bewerken om details te wijzigen.', 'info');
                                    onClose();
                                }} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2"><Lightbulb className="w-3 h-3 text-yellow-400" /> Licht </button>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    handlers.addEventBelow(index, 'Media', 'Media');
                                    useSequencerStore.getState().addToast('Media toegevoegd. Vouw het event uit of gebruik Bewerken om details te wijzigen.', 'info');
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
    const showTimingDurationsByKey = useSequencerStore(s => s.showTimingDurationsByKey)
    const gridDevices = useSequencerStore(s => s.appSettings?.devices ?? []) as Device[]
    const lightStripPreviewOn = useSequencerStore(s =>
        isLightStripPreviewEnabled(s.appSettings.lightStripPreviewEnabled)
    )

    // Actions
    const deleteGroup = useSequencerStore(s => s.deleteGroup)
    const reorderActBefore = useSequencerStore(s => s.reorderActBefore)
    const reorderSceneBefore = useSequencerStore(s => s.reorderSceneBefore)
    const moveEventGroupBefore = useSequencerStore(s => s.moveEventGroupBefore)
    const moveEventGroupAfter = useSequencerStore(s => s.moveEventGroupAfter)
    const moveActionRowWithinGroup = useSequencerStore(s => s.moveActionRowWithinGroup)
    const insertAct = useSequencerStore(s => s.insertAct)
    const insertScene = useSequencerStore(s => s.insertScene)
    const insertEvent = useSequencerStore(s => s.insertEvent)

    const isElectronHost = typeof window !== 'undefined' && !!(window as any).require

    const [editRowIndex, setEditRowIndex] = useState<number | null>(null)
    const rowEditRequestFromPdfMarker = useSequencerStore(s => s.rowEditRequestFromPdfMarker)
    const clearRowEditRequestFromPdfMarker = useSequencerStore(s => s.clearRowEditRequestFromPdfMarker)
    const [menuOpenIndex, setMenuOpenIndex] = useState<number | string | null>(null)
    const [treeMenu, setTreeMenu] = useState<{ top: number; left: number; content: React.ReactNode } | null>(null)
    const [actEditActId, setActEditActId] = useState<string | null>(null)
    const [sceneEdit, setSceneEdit] = useState<{ actId: string; sceneId: number } | null>(null)
    const [eventEdit, setEventEdit] = useState<{ titleOriginalIndex: number } | null>(null)

    const [seqDndSourceKey, setSeqDndSourceKey] = useState<string | null>(null)
    const [seqDndHover, setSeqDndHover] = useState<{ targetKey: string; edge: 'before' | 'after' } | null>(null)

    useEffect(() => {
        const clear = () => {
            setSeqDndSourceKey(null)
            setSeqDndHover(null)
        }
        window.addEventListener('dragend', clear, true)
        return () => window.removeEventListener('dragend', clear, true)
    }, [])

    const openSequenceTreeMenu = useCallback((anchorEl: HTMLElement, content: React.ReactNode) => {
        const r = anchorEl.getBoundingClientRect()
        const w = 240
        setMenuOpenIndex(null)
        setTreeMenu({
            top: r.bottom + 4,
            left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
            content,
        })
    }, [])

    useEffect(() => {
        if (rowEditRequestFromPdfMarker === null) return
        const idx = rowEditRequestFromPdfMarker
        clearRowEditRequestFromPdfMarker()
        if (!isLocked) {
            setEditRowIndex(idx)
        } else {
            useSequencerStore.getState().addToast('Schakel naar bewerkmodus om de actie te bewerken.', 'info')
        }
    }, [rowEditRequestFromPdfMarker, isLocked, clearRowEditRequestFromPdfMarker])

    // Clear row editor + menu when locked (Show Mode)
    useEffect(() => {
        if (isLocked) {
            setEditRowIndex(null)
            setMenuOpenIndex(null)
            setTreeMenu(null)
            setActEditActId(null)
            setSceneEdit(null)
            setEventEdit(null)
            const s = useSequencerStore.getState()
            const show = s.activeShow
            if (show?.viewState?.sequenceReorderMode) {
                void s.updateActiveShow({
                    viewState: { ...show.viewState, sequenceReorderMode: false },
                })
            }
        }
    }, [isLocked])

    useEffect(() => {
        if (!treeMenu) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setTreeMenu(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [treeMenu])

    // Dynamic Collapse State Logic
    const collapsedGroups = isLocked
        ? (runtimeCollapsedGroups || {})
        : (activeShow?.viewState?.collapsedGroups || {})

    /** Alleen in edit-modus; in show-modus staat de vlag uit (en wordt bij lock gereset). */
    const sequenceReorderMode = !!(activeShow?.viewState?.sequenceReorderMode && !isLocked)

    const buildActionRowDnD = useCallback(
        (originalIndex: number, ev: ShowEvent): ActionRowDnDProps | undefined => {
            if (!sequenceReorderMode || isLocked) return undefined
            if (ev.type?.toLowerCase() !== 'action') return undefined
            const rowKey = `ar-${originalIndex}`
            return {
                rowKey,
                seqDndHover,
                seqDndSourceKey,
                onGripDragStart: e => {
                    e.stopPropagation()
                    setSeqDndSourceKey(rowKey)
                    const payload: SequenceDragPayload = { kind: 'actionRow', fromIndex: originalIndex }
                    sequenceTreeDragRef.current = payload
                    e.dataTransfer.setData(SEQUENCE_DND_MIME, JSON.stringify(payload))
                    e.dataTransfer.effectAllowed = 'move'
                },
                onGripDragEnd: () => {
                    sequenceTreeDragRef.current = null
                    setSeqDndSourceKey(null)
                    setSeqDndHover(null)
                },
                onRowDragOver: e => {
                    let p: SequenceDragPayload | null = sequenceTreeDragRef.current
                    if (!p) {
                        try {
                            p = JSON.parse(e.dataTransfer.getData(SEQUENCE_DND_MIME) || '{}')
                        } catch {
                            p = null
                        }
                    }
                    if (!p || p.kind !== 'actionRow') return
                    const fromEv = events[p.fromIndex]
                    const toEv = events[originalIndex]
                    if (!fromEv || !toEv) return
                    if (fromEv.type?.toLowerCase() !== 'action' || toEv.type?.toLowerCase() !== 'action') return
                    if (fromEv.act !== toEv.act || fromEv.sceneId !== toEv.sceneId || fromEv.eventId !== toEv.eventId) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const after = e.clientY > rect.top + rect.height * 0.55
                    setSeqDndHover({ targetKey: rowKey, edge: after ? 'after' : 'before' })
                },
                onRowDragLeave: e => {
                    if (seqDndHover?.targetKey !== rowKey) return
                    const rel = e.relatedTarget as Node | null
                    if (!rel || !e.currentTarget.contains(rel)) setSeqDndHover(null)
                },
                onRowDrop: e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSeqDndHover(null)
                    let p: SequenceDragPayload | null = sequenceTreeDragRef.current
                    if (!p) {
                        try {
                            p = JSON.parse(e.dataTransfer.getData(SEQUENCE_DND_MIME) || '{}')
                        } catch {
                            p = null
                        }
                    }
                    sequenceTreeDragRef.current = null
                    setSeqDndSourceKey(null)
                    if (!p || p.kind !== 'actionRow') return
                    const fromEv = events[p.fromIndex]
                    const toEv = events[originalIndex]
                    if (!fromEv || !toEv) return
                    if (fromEv.type?.toLowerCase() !== 'action' || toEv.type?.toLowerCase() !== 'action') return
                    if (fromEv.act !== toEv.act || fromEv.sceneId !== toEv.sceneId || fromEv.eventId !== toEv.eventId) return
                    if (p.fromIndex === originalIndex) return
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const after = e.clientY > rect.top + rect.height * 0.55
                    moveActionRowWithinGroup(p.fromIndex, originalIndex, after ? 'after' : 'before')
                },
            }
        },
        [sequenceReorderMode, isLocked, seqDndHover, seqDndSourceKey, events, moveActionRowWithinGroup]
    )

    const SHOW_TREE_COLLAPSE_KEY = 'show'
    const showTreeCollapsed = !!collapsedGroups[SHOW_TREE_COLLAPSE_KEY]

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
        if (isLocked && activeGroupRef.current && editRowIndex === null) {
            activeGroupRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
    }, [activeEventIndex, editRowIndex, isLocked])



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
        flatIndex?: number
        isPast?: boolean
        duration: number
        activeDuration: number
        isMinimal: boolean
        ongoingEffects?: { type: 'media' | 'light'; id: string }[]
    }

    interface SceneNode {
        id: number | undefined // sceneId
        events: EventNode[]
        isActive: boolean
        isPast?: boolean
    }

    interface ActNode {
        id: string // "Act 1"
        scenes: SceneNode[]
        /** Rijen zonder sceneId/eventId (o.a. act-comment na reindex) — niet in Scene 0 / Event 0-0 tonen. */
        actLevelRows?: { event: ShowEvent; originalIndex: number; id: number }[]
        isActive: boolean
        isPast?: boolean
    }

    const firstAnchoredOriginalIndex = (act: ActNode): number => {
        const a0 = act.actLevelRows?.[0]?.originalIndex
        if (a0 !== undefined) return a0
        for (const scene of act.scenes) {
            for (const en of scene.events) {
                const r = en.rows[0]
                if (r) return r.originalIndex
            }
        }
        return 0
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
                act = { id: event.act, scenes: [], isActive: false, actLevelRows: [] }
                acts.push(act)
            }
            if (!act.actLevelRows) act.actLevelRows = []

            // Act/Scene header rows are structural; they should not create "Event 0" groups.
            // They are rendered by the Act/Scene headers in the grid, not as event cards.
            const typeLower = (event.type || '').toLowerCase()
            if (typeLower === 'act') return

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

            // Act-orphan rijen (reindex wist sceneId/eventId voor commentaar vóór de eerste Scene):
            // niet onder Scene 0 / Event 0-0 stoppen.
            if (event.sceneId === undefined && event.eventId === undefined) {
                act.actLevelRows!.push({ event, originalIndex: index, id: index })
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

        // 1b. Sort act-level rijen; lege event-cards weg; Scene zonder inhoud alleen houden als er een Scene-header in de platte lijst is.
        acts.forEach(act => {
            act.actLevelRows?.sort((a, b) => a.originalIndex - b.originalIndex)
            act.scenes.forEach(scene => {
                scene.events = scene.events.filter(en => en.rows.length > 0)
            })
            act.scenes = act.scenes.filter(
                scene =>
                    scene.events.length > 0 ||
                    events.some(
                        (e: ShowEvent) =>
                            e.act === act.id &&
                            (e.type || '').toLowerCase() === 'scene' &&
                            (e.sceneId ?? 0) === (scene.id ?? 0)
                    )
            )
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

        // 2b. Show mode: mark event cards / acts / scenes that are fully before the active card
        allEventNodes.forEach((item, idx) => {
            item.eventNode.flatIndex = idx
            item.eventNode.isPast = activeNodeIdx >= 0 && idx < activeNodeIdx
        })
        acts.forEach(act => {
            let actMax = -1
            act.scenes.forEach(scene => {
                let sceneMax = -1
                scene.events.forEach(en => {
                    const fi = en.flatIndex ?? -1
                    if (fi > actMax) actMax = fi
                    if (fi > sceneMax) sceneMax = fi
                })
                scene.isPast = activeNodeIdx >= 0 && sceneMax >= 0 && sceneMax < activeNodeIdx
            })
            act.isPast = activeNodeIdx >= 0 && actMax >= 0 && actMax < activeNodeIdx
        })

        // 3. Calculate durations and minimal flag for each event node
        const getEffectiveDuration = (node: EventNode) => {
            const triggerRow = node.rows.find(r => r.event.type?.toLowerCase() === 'trigger')
            const tr = triggerRow?.event
            if (tr?.effect?.toLowerCase() === 'timed') return tr.duration || 0
            if (!tr) return 0
            const samples = getTransitionTimingSamples(tr, showTimingDurationsByKey)
            if (samples.length) return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
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
    }, [events, activeEventIndex, showTimingDurationsByKey, gridDevices, isLocked])

    const handleRowClick = (index: number) => {
        if (!isLocked) {
            setSelectedEvent(index)
            const ev = events[index]
            const t = ev?.type?.toLowerCase() || ''
            if (t === 'action' || t === 'light' || t === 'media') {
                setEditRowIndex(index)
            }
        }
    }

    const handleRowDoubleClick = (originalIndex: number) => {
        if (isLocked) {
            setActiveEvent(originalIndex)
            return
        }
        const ev = events[originalIndex]
        const t = ev?.type?.toLowerCase() || ''
        if (t === 'action' || t === 'light' || t === 'media') {
            setSelectedEvent(originalIndex)
            setEditRowIndex(originalIndex)
            return
        }
        if (t === 'comment' || t === 'title') {
            setSelectedEvent(originalIndex)
            setEditRowIndex(originalIndex)
        } else {
            setActiveEvent(originalIndex)
        }
    }

    useEffect(() => {
        if (isLocked) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return
            const el = e.target as HTMLElement
            if (el.closest('input, textarea, select, button, [contenteditable="true"]')) return
            if (selectedEventIndex < 0) return
            const ev = events[selectedEventIndex]
            const ty = ev?.type?.toLowerCase() || ''
            if (ty === 'action' || ty === 'light' || ty === 'media' || ty === 'comment' || ty === 'title') {
                e.preventDefault()
                setEditRowIndex(selectedEventIndex)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isLocked, selectedEventIndex, events])

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
        <div className="relative flex flex-1 min-h-0 flex-col bg-black/20">
            {treeMenu &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-[9990]" aria-hidden onClick={() => setTreeMenu(null)} />
                        <div
                            role="menu"
                            className="fixed z-[9991] w-60 rounded-lg border border-white/10 bg-[#101010] shadow-[0_20px_50px_rgba(0,0,0,0.82)] py-1 max-h-[min(70vh,420px)] overflow-y-auto"
                            style={{ top: treeMenu.top, left: treeMenu.left }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {treeMenu.content}
                        </div>
                    </>,
                    document.body
                )}
            {/* Show-balk: vast boven de scrollbare tree (geen overlay / geen sticky) */}
            {(hierarchy.length > 0 || events.length === 0) && (
                <div className="relative shrink-0 group/show px-4 pt-4 pb-2 text-sm">
                    <div
                        className={cn(
                            'relative flex min-w-0 items-center gap-2 border-l-4 px-3 py-2 shadow-lg rounded-lg transition-[filter,background-color] sm:px-4',
                            isLocked
                                ? 'bg-gradient-to-r from-violet-950/95 via-indigo-950/95 to-slate-900/95 border-violet-400/75 hover:brightness-[1.04]'
                                : 'bg-gradient-to-r from-orange-900/95 via-amber-900/90 to-orange-950/95 border-orange-400/85 hover:brightness-[1.04]'
                        )}
                    >
                        <div className={TREE_CHEVRON_COL}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleCollapse(SHOW_TREE_COLLAPSE_KEY)
                                }}
                                className="rounded p-0.5 hover:bg-white/10"
                                title={showTreeCollapsed ? 'Sequence uitklappen' : 'Sequence inklappen'}
                            >
                                {showTreeCollapsed ? <ChevronRight className="h-4 w-4 opacity-70" /> : <ChevronDown className="h-4 w-4 opacity-70" />}
                            </button>
                        </div>
                        <div className="flex min-w-0 flex-1 items-baseline gap-2">
                            <span
                                className={cn(
                                    'shrink-0 text-sm font-black uppercase tracking-widest',
                                    isLocked ? 'text-violet-200' : 'text-orange-50'
                                )}
                            >
                                Show
                            </span>
                            <span className="min-w-0 truncate text-sm font-bold text-white/90">
                                {activeShow?.name || <span className="opacity-30 italic">Naamloze show</span>}
                            </span>
                        </div>
                        <div className={TREE_RIGHT_CLUSTER}>
                            <div className={TREE_META_RAIL}>
                                <span className="shrink-0 text-[10px] font-mono tabular-nums text-white/40">
                                    {events.length ? `${activeEventIndex + 1} / ${events.length}` : '0 / 0'}
                                </span>
                                <LightStripPreviewSwitch
                                    compact
                                    className="border-white/20"
                                    title="Licht preview-balk (WLED peek / WiZ kleur) aan of uit"
                                />
                                {activeShow && isElectronHost && (
                                    <div className="flex w-[4.25rem] shrink-0 justify-end">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                window.dispatchEvent(new Event('hub:toggle-show-edit-mode'))
                                            }}
                                            className={cn(
                                                'flex h-7 w-full min-w-0 items-center justify-center gap-1 rounded-md border px-1 text-[9px] font-bold uppercase leading-none transition-all',
                                                isLocked
                                                    ? 'border-white/25 bg-white/10 text-white hover:bg-white/18'
                                                    : 'border-orange-400/60 bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.35)] hover:bg-orange-400'
                                            )}
                                            title={isLocked ? 'Schakel naar bewerkmodus' : 'Ga naar show (media-controle)'}
                                        >
                                            {isLocked ? <Lock className="h-3 w-3 shrink-0 opacity-90" /> : <LockOpen className="h-3 w-3 shrink-0" />}
                                            <span className="truncate">{isLocked ? 'Show' : 'Edit'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            {!isLocked && (
                            <button
                                type="button"
                                className={cn(SEQUENCE_TREE_MORE_BTN, 'opacity-0 group-hover/show:opacity-100 transition-opacity')}
                                title="Show-acties"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    openSequenceTreeMenu(e.currentTarget, (
                                        <>
                                            <button
                                                type="button"
                                                className={SEQUENCE_TREE_MENU_ITEM}
                                                onClick={() => {
                                                    if (!events.length) insertAct(0, 'before')
                                                    else insertAct(firstAnchoredOriginalIndex(hierarchy[0]), 'before')
                                                    setTreeMenu(null)
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                                                Toevoegen (eerste) act
                                            </button>
                                            <button
                                                type="button"
                                                className={SEQUENCE_TREE_MENU_ITEM}
                                                onClick={() => {
                                                    setTreeMenu(null)
                                                    window.dispatchEvent(new Event('hub:open-project-settings'))
                                                }}
                                            >
                                                <Settings className="w-3.5 h-3.5 text-primary shrink-0" />
                                                Show instellingen
                                            </button>
                                            <button
                                                type="button"
                                                className={SEQUENCE_TREE_MENU_ITEM}
                                                onClick={() => {
                                                    useSequencerStore.getState().reindexEvents()
                                                    useSequencerStore.getState().addToast('Sequence succesvol hernummerd', 'info')
                                                    setTreeMenu(null)
                                                }}
                                            >
                                                <ListOrdered className="w-3.5 h-3.5 text-primary shrink-0" />
                                                Hernummeren
                                            </button>
                                            <button
                                                type="button"
                                                className={SEQUENCE_TREE_MENU_ITEM}
                                                onClick={() => {
                                                    setTreeMenu(null)
                                                    runCheck()
                                                }}
                                            >
                                                <ClipboardCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                                Controleren
                                            </button>
                                            <div className="my-1 h-px bg-white/10 mx-2" />
                                            <button
                                                type="button"
                                                className={cn(SEQUENCE_TREE_MENU_ITEM, (!activeShow || !isElectronHost) && 'opacity-40 pointer-events-none')}
                                                disabled={!activeShow || !isElectronHost}
                                                onClick={() => {
                                                    setTreeMenu(null)
                                                    window.dispatchEvent(new Event('hub:export-show'))
                                                }}
                                            >
                                                <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                                                Exporteer show
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(SEQUENCE_TREE_MENU_ITEM, !isElectronHost && 'opacity-40 pointer-events-none')}
                                                disabled={!isElectronHost}
                                                onClick={() => {
                                                    setTreeMenu(null)
                                                    window.dispatchEvent(new Event('hub:import-show'))
                                                }}
                                            >
                                                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                                Importeer show
                                            </button>
                                            <SequenceTreeShowMenuToggles />
                                        </>
                                    ))
                                }}
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className="flex-1 min-h-0 space-y-6 overflow-y-auto overflow-x-hidden scroll-smooth px-4 pb-4 custom-scrollbar"
            >
            {hierarchy.length === 0 && events.length > 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40 italic text-sm">
                    Geen sequence data gevonden
                </div>
            )}

            {/* Edit-mode: no extra HUD/tools row needed */}

            {!showTreeCollapsed && hierarchy.map((act, actIndex) => {
                // Dynamic Collapse: everything collapsed except active and next group during playback
                const actCollapsed = collapsedGroups[`act-${act.id}`]

                return (
                    <div key={act.id} className="relative group/act text-sm mb-6">
                        {/* ACT Header */}
                        <div
                            className={cn(
                                'relative z-20 mb-2 flex min-w-0 items-center gap-2 border-l-4 border-primary bg-[#111] px-3 py-2 shadow-lg transition-[colors,opacity] group-hover/act:bg-[#1a1a1a] sm:px-4 sticky top-0',
                                isLocked && act.isPast && showModePastClass,
                                !isLocked && 'cursor-pointer',
                                seqDndSourceKey === `act-${act.id}` && 'opacity-45'
                            )}
                            onClick={(e) => {
                                if (isLocked) return
                                const t = e.target as HTMLElement
                                if (t.closest('button') || t.closest('[data-seq-dnd-grip]')) return
                                setTreeMenu(null)
                                setActEditActId(act.id)
                            }}
                            onDragOver={
                                !isLocked
                                    ? (e) => {
                                          const p = sequenceTreeDragRef.current
                                          if (p?.kind === 'act' && p.actName !== act.id) {
                                              e.preventDefault()
                                              e.dataTransfer.dropEffect = 'move'
                                              setSeqDndHover({ targetKey: `act-${act.id}`, edge: 'before' })
                                          }
                                      }
                                    : undefined
                            }
                            onDragLeave={
                                !isLocked
                                    ? (e) => {
                                          if (seqDndHover?.targetKey !== `act-${act.id}`) return
                                          const rel = e.relatedTarget as Node | null
                                          if (!rel || !e.currentTarget.contains(rel)) setSeqDndHover(null)
                                      }
                                    : undefined
                            }
                            onDrop={
                                !isLocked
                                    ? (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setSeqDndHover(null)
                                          let p: SequenceDragPayload | null = sequenceTreeDragRef.current
                                          if (!p) {
                                              try {
                                                  p = JSON.parse(e.dataTransfer.getData(SEQUENCE_DND_MIME) || '{}')
                                              } catch {
                                                  p = null
                                              }
                                          }
                                          sequenceTreeDragRef.current = null
                                          if (p?.kind === 'act' && p.actName !== act.id) {
                                              reorderActBefore(p.actName, act.id)
                                          }
                                      }
                                    : undefined
                            }
                        >
                            {seqDndHover?.targetKey === `act-${act.id}` && seqDndHover.edge === 'before' && (
                                <div className={cn(TREE_DROP_LINE, 'top-0')} aria-hidden />
                            )}
                            <div className={TREE_CHEVRON_COL}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleCollapse(`act-${act.id}`)
                                    }}
                                    className="rounded p-0.5 hover:bg-white/10"
                                    title={actCollapsed ? 'Uitklappen' : 'Inklappen'}
                                >
                                    {actCollapsed ? <ChevronRight className="h-4 w-4 opacity-70" /> : <ChevronDown className="h-4 w-4 opacity-70" />}
                                </button>
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="min-w-0 truncate text-sm font-black uppercase tracking-widest text-primary">{act.id}</span>
                                {isLocked && act.isActive && (
                                    <span className="shrink-0 text-[9px] font-black uppercase text-primary animate-bright-pulse rounded px-1.5 py-0.5">
                                        Huidig
                                    </span>
                                )}
                            </div>
                            <div className={TREE_RIGHT_CLUSTER}>
                                <div className={TREE_META_RAIL} aria-hidden />
                                {!isLocked && (
                                    <>
                                        {!sequenceReorderMode && (
                                            <button
                                                type="button"
                                                className={cn(SEQUENCE_TREE_MORE_BTN, 'opacity-0 transition-opacity group-hover/act:opacity-100')}
                                                title="Act-acties"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const lastScene = act.scenes[act.scenes.length - 1]
                                                    const lastEventNode = lastScene?.events[lastScene.events.length - 1]
                                                    const lastRow = lastEventNode?.rows[lastEventNode.rows.length - 1]
                                                    openSequenceTreeMenu(e.currentTarget, (
                                                        <>
                                                            <div className={SEQUENCE_TREE_MENU_LABEL}>Toevoegen</div>
                                                            <div className={SEQUENCE_TREE_MENU_NEST}>Act</div>
                                                            <button
                                                                type="button"
                                                                className={SEQUENCE_TREE_MENU_NEST_ITEM}
                                                                onClick={() => {
                                                                    insertAct(firstAnchoredOriginalIndex(act), 'before')
                                                                    setTreeMenu(null)
                                                                }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                                Voor deze act
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={cn(SEQUENCE_TREE_MENU_NEST_ITEM, !lastRow && 'pointer-events-none opacity-40')}
                                                                disabled={!lastRow}
                                                                onClick={() => {
                                                                    if (lastRow) insertAct(lastRow.originalIndex, 'after')
                                                                    setTreeMenu(null)
                                                                }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                                Na deze act
                                                            </button>
                                                            <div className={SEQUENCE_TREE_MENU_NEST}>Scene</div>
                                                            <button
                                                                type="button"
                                                                className={SEQUENCE_TREE_MENU_NEST_ITEM}
                                                                onClick={() => {
                                                                    insertScene(firstAnchoredOriginalIndex(act), 'before')
                                                                    setTreeMenu(null)
                                                                }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                                Eerste scene (nieuw bovenaan in act)
                                                            </button>
                                                            <div className="mx-2 my-1 h-px bg-white/10" />
                                                            <button
                                                                type="button"
                                                                className={cn(SEQUENCE_TREE_MENU_ITEM, 'text-red-400 hover:bg-red-500/10')}
                                                                onClick={() => {
                                                                    setTreeMenu(null)
                                                                    openModal({
                                                                        title: 'Act verwijderen',
                                                                        message: `Weet je zeker dat je act "${act.id}" en alle inhoud wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
                                                                        type: 'confirm',
                                                                        onConfirm: () => deleteAct(act.id)
                                                                    })
                                                                }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                                                Verwijderen (act)
                                                            </button>
                                                        </>
                                                    ))
                                                }}
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        )}
                                        {sequenceReorderMode && (
                                            <span
                                                data-seq-dnd-grip
                                                role="button"
                                                tabIndex={0}
                                                draggable
                                                title="Act slepen (neerzetten vóór deze act)"
                                                className={cn(SEQUENCE_TREE_DRAG_GRIP, 'opacity-100')}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                onDragStart={(e) => {
                                                    e.stopPropagation()
                                                    setSeqDndSourceKey(`act-${act.id}`)
                                                    const payload: SequenceDragPayload = { kind: 'act', actName: act.id }
                                                    sequenceTreeDragRef.current = payload
                                                    e.dataTransfer.setData(SEQUENCE_DND_MIME, JSON.stringify(payload))
                                                    e.dataTransfer.effectAllowed = 'move'
                                                }}
                                                onDragEnd={() => {
                                                    sequenceTreeDragRef.current = null
                                                }}
                                            >
                                                <GripVertical className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {!actCollapsed && (
                            <div className="pl-4 space-y-4 border-l border-white/5 ml-2">
                                {act.actLevelRows && act.actLevelRows.length > 0 && (
                                    <div className="flex flex-col divide-y divide-white/8 border border-white/8 rounded-lg overflow-hidden bg-black/20 -ml-1">
                                        {act.actLevelRows.map((item, idx) => (
                                            <RowItem
                                                key={`act-level-${item.id}`}
                                                event={item.event}
                                                originalIndex={item.originalIndex}
                                                id={item.id}
                                                zebraIndex={idx}
                                                isActiveGroup={false}
                                                isNextGroup={false}
                                                handleRowClick={handleRowClick}
                                                handleRowDoubleClick={handleRowDoubleClick}
                                                onRequestEditRow={setEditRowIndex}
                                                isRowSelected={selectedEventIndex === item.originalIndex}
                                                menuOpenIndex={menuOpenIndex}
                                                setMenuOpenIndex={setMenuOpenIndex}
                                                isLocked={isLocked}
                                                activeEventIndex={activeEventIndex}
                                                eventStatuses={eventStatuses}
                                                selectedEventIndex={selectedEventIndex}
                                                selectedEvent={selectedEvent}
                                                sequenceReorderMode={sequenceReorderMode}
                                                actionRowDnD={buildActionRowDnD(item.originalIndex, item.event)}
                                            />
                                        ))}
                                    </div>
                                )}
                                {act.scenes.map((scene, sceneIndex) => {
                                    const sceneDesc = activeShow?.viewState?.sceneNames?.[`${act.id}-${scene.id}`] ?? ''

                                    // Dynamic Collapse
                                    const sceneCollapsed = collapsedGroups[`scene-${act.id}-${scene.id}`]

                                    return (
                                        <div key={scene.id} className="relative group/scene">
                                            {/* SCENE Header */}
                                            <div
                                                className={cn(
                                                    'relative mb-2 flex min-w-0 items-center gap-2 border-l-4 py-2 pl-2 pr-3 transition-opacity sm:pl-3 sm:pr-4',
                                                    isLocked && scene.isActive ? 'border-green-500/60' : 'border-white/10',
                                                    isLocked && scene.isPast && showModePastClass,
                                                    seqDndSourceKey === `scene-${act.id}-${scene.id ?? 0}` && 'opacity-45',
                                                    !isLocked && 'cursor-pointer'
                                                )}
                                                onDoubleClick={(e) => {
                                                    if (!isLocked) return
                                                    const t = e.target as HTMLElement
                                                    if (t.closest('button') || t.closest('[data-seq-dnd-grip]')) return
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    const firstEv = scene.events[0]
                                                    const tr = firstEv?.rows?.find(r => (r.event.type || '').toLowerCase() === 'title')
                                                    const idx = tr?.originalIndex ?? firstEv?.rows[0]?.originalIndex
                                                    if (idx === undefined) return
                                                    setActiveEvent(idx)
                                                }}
                                                onClick={(e) => {
                                                    if (isLocked) return
                                                    const t = e.target as HTMLElement
                                                    if (t.closest('button') || t.closest('[data-seq-dnd-grip]')) return
                                                    setTreeMenu(null)
                                                    setSceneEdit({ actId: act.id, sceneId: scene.id ?? 0 })
                                                }}
                                                onDragOver={
                                                    !isLocked
                                                        ? (e) => {
                                                              const p = sequenceTreeDragRef.current
                                                              const sid = scene.id ?? 0
                                                              if (
                                                                  p?.kind === 'scene' &&
                                                                  p.actName === act.id &&
                                                                  p.sceneId !== sid
                                                              ) {
                                                                  e.preventDefault()
                                                                  e.dataTransfer.dropEffect = 'move'
                                                                  setSeqDndHover({ targetKey: `scene-${act.id}-${sid}`, edge: 'before' })
                                                              }
                                                          }
                                                        : undefined
                                                }
                                                onDragLeave={
                                                    !isLocked
                                                        ? (e) => {
                                                              const sid = scene.id ?? 0
                                                              const key = `scene-${act.id}-${sid}`
                                                              if (seqDndHover?.targetKey !== key) return
                                                              const rel = e.relatedTarget as Node | null
                                                              if (!rel || !e.currentTarget.contains(rel)) setSeqDndHover(null)
                                                          }
                                                        : undefined
                                                }
                                                onDrop={
                                                    !isLocked
                                                        ? (e) => {
                                                              e.preventDefault()
                                                              e.stopPropagation()
                                                              setSeqDndHover(null)
                                                              let p: SequenceDragPayload | null = sequenceTreeDragRef.current
                                                              if (!p) {
                                                                  try {
                                                                      p = JSON.parse(e.dataTransfer.getData(SEQUENCE_DND_MIME) || '{}')
                                                                  } catch {
                                                                      p = null
                                                                  }
                                                              }
                                                              sequenceTreeDragRef.current = null
                                                              const sid = scene.id ?? 0
                                                              if (p?.kind === 'scene' && p.actName === act.id && p.sceneId !== sid) {
                                                                  reorderSceneBefore(act.id, p.sceneId, sid)
                                                              }
                                                          }
                                                        : undefined
                                                }
                                            >
                                                {seqDndHover?.targetKey === `scene-${act.id}-${scene.id ?? 0}` &&
                                                    seqDndHover.edge === 'before' && <div className={cn(TREE_DROP_LINE, 'top-0')} aria-hidden />}
                                                <div className={TREE_CHEVRON_COL}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleCollapse(`scene-${act.id}-${scene.id}`)
                                                        }}
                                                        className="rounded p-0.5 hover:bg-white/10"
                                                        title={sceneCollapsed ? 'Uitklappen' : 'Inklappen'}
                                                    >
                                                        {sceneCollapsed ? <ChevronRight className="h-3 w-3 opacity-60" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
                                                    </button>
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'min-w-0 flex-1 truncate text-sm font-bold',
                                                            !isLocked && 'text-white/90',
                                                            isLocked && (scene.isActive ? 'text-green-300' : 'text-white/80')
                                                        )}
                                                        title={!isLocked ? 'Klik om scene te bewerken' : undefined}
                                                    >
                                                        {sceneDesc || (
                                                            <span
                                                                className={cn('text-xs italic opacity-30', !isLocked && 'text-white/40')}
                                                            >
                                                                Scene {scene.id}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {isLocked && scene.isActive && (
                                                        <span className="shrink-0 text-[9px] font-black uppercase text-green-400 animate-bright-pulse rounded px-1.5 py-0.5">
                                                            Huidig
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={TREE_RIGHT_CLUSTER}>
                                                    <div className={TREE_META_RAIL}>
                                                        <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-white/25">
                                                            Sc {scene.id}
                                                        </span>
                                                    </div>
                                                    {!isLocked && (
                                                        <>
                                                            {!sequenceReorderMode && (
                                                                <button
                                                                    type="button"
                                                                    className={cn(
                                                                        SEQUENCE_TREE_MORE_BTN,
                                                                        'opacity-0 transition-opacity group-hover/scene:opacity-100'
                                                                    )}
                                                                    title="Scene-acties"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        const firstEventIdx = scene.events[0]?.rows[0]?.originalIndex ?? 0
                                                                        const lastEv = scene.events[scene.events.length - 1]
                                                                        const lastRow = lastEv?.rows[lastEv.rows.length - 1]
                                                                        openSequenceTreeMenu(e.currentTarget, (
                                                                            <>
                                                                                <div className={SEQUENCE_TREE_MENU_LABEL}>Scene</div>
                                                                                <button
                                                                                    type="button"
                                                                                    className={SEQUENCE_TREE_MENU_ITEM}
                                                                                    onClick={() => {
                                                                                        insertScene(firstEventIdx, 'before')
                                                                                        setTreeMenu(null)
                                                                                    }}
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5 text-primary" /> Invoegen vóór
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className={cn(SEQUENCE_TREE_MENU_ITEM, !lastRow && 'opacity-40 pointer-events-none')}
                                                                                    disabled={!lastRow}
                                                                                    onClick={() => {
                                                                                        if (lastRow) insertScene(lastRow.originalIndex, 'after')
                                                                                        setTreeMenu(null)
                                                                                    }}
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5 text-primary" /> Invoegen na
                                                                                </button>
                                                                                <div className={SEQUENCE_TREE_MENU_LABEL}>Event</div>
                                                                                <button
                                                                                    type="button"
                                                                                    className={SEQUENCE_TREE_MENU_ITEM}
                                                                                    onClick={() => {
                                                                                        insertEvent(firstEventIdx, 'before')
                                                                                        setTreeMenu(null)
                                                                                    }}
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5 text-primary" /> Event toevoegen
                                                                                </button>
                                                                                <div className="my-1 h-px bg-white/10" />
                                                                                <button
                                                                                    type="button"
                                                                                    className={cn(SEQUENCE_TREE_MENU_ITEM, 'text-red-400 hover:bg-red-500/10')}
                                                                                    onClick={() => {
                                                                                        setTreeMenu(null)
                                                                                        openModal({
                                                                                            title: 'Scene Verwijderen',
                                                                                            message: `Weet je zeker dat je Scene "SCENE ${scene.id}" en alle inhoud wilt verwijderen?`,
                                                                                            type: 'confirm',
                                                                                            onConfirm: () => deleteScene(act.id, scene.id || 0)
                                                                                        })
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" /> Scene verwijderen
                                                                                </button>
                                                                            </>
                                                                        ))
                                                                    }}
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            {sequenceReorderMode && (
                                                                <span
                                                                    data-seq-dnd-grip
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    draggable
                                                                    title="Scene slepen (neerzetten vóór deze scene)"
                                                                    className={cn(SEQUENCE_TREE_DRAG_GRIP, 'opacity-100')}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                    onDragStart={(e) => {
                                                                        e.stopPropagation()
                                                                        setSeqDndSourceKey(`scene-${act.id}-${scene.id ?? 0}`)
                                                                        const payload: SequenceDragPayload = {
                                                                            kind: 'scene',
                                                                            actName: act.id,
                                                                            sceneId: scene.id ?? 0,
                                                                        }
                                                                        sequenceTreeDragRef.current = payload
                                                                        e.dataTransfer.setData(SEQUENCE_DND_MIME, JSON.stringify(payload))
                                                                        e.dataTransfer.effectAllowed = 'move'
                                                                    }}
                                                                    onDragEnd={() => {
                                                                        sequenceTreeDragRef.current = null
                                                                    }}
                                                                >
                                                                    <GripVertical className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
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
                                                            const getNextEventNodeCrossScene = () => {
                                                                if (eventIdx + 1 < eventNodesWithTriggers.length) {
                                                                    return eventNodesWithTriggers[eventIdx + 1].eventNode
                                                                }
                                                                for (let si = sceneIndex + 1; si < act.scenes.length; si++) {
                                                                    const evs = act.scenes[si].events
                                                                    if (evs?.length) return evs[0]
                                                                }
                                                                for (let ai = actIndex + 1; ai < hierarchy.length; ai++) {
                                                                    const ha = hierarchy[ai]
                                                                    for (const sc of ha.scenes) {
                                                                        if (sc.events?.length) return sc.events[0]
                                                                    }
                                                                }
                                                                return null
                                                            }
                                                            const nextEventNodeAfterThis = getNextEventNodeCrossScene()
                                                            const isFirstEventGroupInShow = actIndex === 0 && sceneIndex === 0 && eventIdx === 0
                                                            const scrollTransitionRef =
                                                                isLocked && nextEventNodeAfterThis?.isActive ? activeGroupRef : null
                                                            const scrollCardRef =
                                                                isLocked && eventNode.isActive && isFirstEventGroupInShow ? activeGroupRef : null

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

                                                            /** Show mode: videowall_agent media = compact row; local_monitor + other media + lights = full controls + preview. */
                                                            const detailCollapsibleRows = !isLocked
                                                                ? collapsibleRows
                                                                : collapsibleRows.filter(r => !isProjectionStyleMediaRow(r.event, gridDevices))
                                                            const compactProjectionMediaRows = isLocked
                                                                ? collapsibleRows.filter(r => isProjectionStyleMediaRow(r.event, gridDevices))
                                                                : []

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

                                                            // Check if the active event's timing has elapsed (for blinking "Next")
                                                            let activeTimeElapsed = false
                                                            if (eventNode.isNext && eventNode.activeDuration > 0 && lastTransitionTime) {
                                                                const effectiveTime = isPaused ? (pauseStartTime || currentTime.getTime()) : currentTime.getTime()
                                                                const elapsed = Math.round((effectiveTime - lastTransitionTime) / 1000)
                                                                activeTimeElapsed = elapsed >= eventNode.activeDuration
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

                                                            const hideCompactEventHeader =
                                                                scene.events.length === 1 && titleRow?.event.cue?.trim() === sceneDesc?.trim()
                                                            const eventGroupStartIdx = eventNode.rows[0]?.originalIndex ?? 0
                                                            const eventDndKey = `evt-${eventNode.uniqueId}`

                                                            const onEventHeaderDragOver = !isLocked
                                                                ? (e: React.DragEvent) => {
                                                                      const p = sequenceTreeDragRef.current
                                                                      if (p?.kind !== 'event') return
                                                                      const list = useSequencerStore.getState().events
                                                                      const fromEv = list[p.groupStartIndex]
                                                                      const toEv = list[eventGroupStartIdx]
                                                                      if (!fromEv || !toEv) return
                                                                      if (fromEv.act !== toEv.act || fromEv.sceneId !== toEv.sceneId) return
                                                                      if (fromEv.eventId === toEv.eventId) return
                                                                      e.preventDefault()
                                                                      e.dataTransfer.dropEffect = 'move'
                                                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                                                      const edge: 'before' | 'after' =
                                                                          e.clientY > rect.top + rect.height * 0.55 ? 'after' : 'before'
                                                                      setSeqDndHover({ targetKey: eventDndKey, edge })
                                                                  }
                                                                : undefined

                                                            const onEventHeaderDragLeave = !isLocked
                                                                ? (e: React.DragEvent) => {
                                                                      if (seqDndHover?.targetKey !== eventDndKey) return
                                                                      const rel = e.relatedTarget as Node | null
                                                                      if (!rel || !e.currentTarget.contains(rel)) setSeqDndHover(null)
                                                                  }
                                                                : undefined

                                                            const onEventHeaderDrop = !isLocked
                                                                ? (e: React.DragEvent) => {
                                                                      e.preventDefault()
                                                                      e.stopPropagation()
                                                                      setSeqDndHover(null)
                                                                      let p: SequenceDragPayload | null = sequenceTreeDragRef.current
                                                                      if (!p) {
                                                                          try {
                                                                              p = JSON.parse(e.dataTransfer.getData(SEQUENCE_DND_MIME) || '{}')
                                                                          } catch {
                                                                              p = null
                                                                          }
                                                                      }
                                                                      sequenceTreeDragRef.current = null
                                                                      if (p?.kind !== 'event') return
                                                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                                                      const after = e.clientY > rect.top + rect.height * 0.55
                                                                      if (after) {
                                                                          moveEventGroupAfter(p.groupStartIndex, eventGroupStartIdx)
                                                                      } else {
                                                                          moveEventGroupBefore(p.groupStartIndex, eventGroupStartIdx)
                                                                      }
                                                                  }
                                                                : undefined

                                                            return (
                                                                <div key={eventNode.uniqueId} className="ml-6 pl-2 border-l border-white/5 relative">
                                                                    {/* EVENT CARD */}
                                                                    <div
                                                                        ref={scrollCardRef}
                                                                        className={cn(
                                                                            'relative mb-1 overflow-hidden rounded-lg transition-[opacity,colors] duration-300 group/event',
                                                                            isLocked && eventNode.isActive
                                                                                ? 'border-2 border-green-500/60 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.08)]'
                                                                                : isLocked && eventNode.isNext
                                                                                  ? 'border-2 border-orange-400/50 bg-orange-500/5'
                                                                                  : isCardSelected
                                                                                    ? 'border-2 border-blue-400/70 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                                                                                    : 'border border-white/8 bg-black/20 hover:border-white/15 hover:bg-white/3',
                                                                            isLocked && eventNode.isPast && showModePastClass,
                                                                            seqDndSourceKey === eventDndKey && 'opacity-45'
                                                                        )}
                                                                        onDoubleClick={(e) => {
                                                                            if (!isLocked) return
                                                                            if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return
                                                                            e.preventDefault()
                                                                            e.stopPropagation()
                                                                            const idx = titleRow?.originalIndex ?? eventGroupStartIdx
                                                                            setActiveEvent(idx)
                                                                        }}
                                                                    >
                                                                        {hideCompactEventHeader && !isLocked && (
                                                                            <div
                                                                                className="relative flex min-w-0 cursor-pointer items-center gap-2 border-b border-white/5 bg-black/25 px-3 py-1.5"
                                                                                onClick={(e) => {
                                                                                    const t = e.target as HTMLElement
                                                                                    if (t.closest('button') || t.closest('[data-seq-dnd-grip]')) return
                                                                                    setTreeMenu(null)
                                                                                    const tidx = titleRow?.originalIndex ?? eventNode.rows[0]?.originalIndex
                                                                                    if (tidx === undefined) return
                                                                                    setEventEdit({ titleOriginalIndex: tidx })
                                                                                }}
                                                                                onDragOver={onEventHeaderDragOver}
                                                                                onDragLeave={onEventHeaderDragLeave}
                                                                                onDrop={onEventHeaderDrop}
                                                                            >
                                                                                {seqDndHover?.targetKey === eventDndKey && seqDndHover.edge === 'before' && (
                                                                                    <div className={cn(TREE_DROP_LINE, 'top-0')} aria-hidden />
                                                                                )}
                                                                                {seqDndHover?.targetKey === eventDndKey && seqDndHover.edge === 'after' && (
                                                                                    <div className={cn(TREE_DROP_LINE, 'bottom-0')} aria-hidden />
                                                                                )}
                                                                                {hasUnderlyingRows ? (
                                                                                    <div className={TREE_CHEVRON_COL}>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation()
                                                                                                toggleCollapse(eventNode.uniqueId)
                                                                                            }}
                                                                                            className="rounded p-0.5 hover:bg-white/10"
                                                                                            title={eventCollapsed ? 'Uitklappen' : 'Inklappen'}
                                                                                        >
                                                                                            {eventCollapsed ? <ChevronRight className="h-3.5 w-3.5 opacity-60" /> : <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className={TREE_CHEVRON_COL} aria-hidden />
                                                                                )}
                                                                                <span className="min-w-0 flex-1 truncate text-sm font-bold text-orange-400" title="Klik om event te bewerken">
                                                                                    {titleRow?.event.cue || 'Event'}
                                                                                </span>
                                                                                <div className={TREE_RIGHT_CLUSTER}>
                                                                                    <div className={TREE_META_RAIL}>
                                                                                        {!isLocked && (
                                                                                            <span className="shrink-0 text-[9px] font-mono opacity-25">
                                                                                                {(eventNode.rows?.[0]?.event?.sceneId ?? 0)}-{(eventNode.rows?.[0]?.event?.eventId ?? 0)}
                                                                                            </span>
                                                                                        )}
                                                                                        {summaryCounts['light'] > 0 && (
                                                                                            <div className="flex shrink-0 items-center gap-0.5 rounded border border-purple-500/30 bg-purple-500/10 px-1 py-0.5 text-[9px] text-purple-200">
                                                                                                <Lightbulb className="h-3 w-3" /> {summaryCounts['light']}
                                                                                            </div>
                                                                                        )}
                                                                                        {summaryCounts['media'] > 0 && (
                                                                                            <div className="flex shrink-0 items-center gap-0.5 rounded border border-blue-500/30 bg-blue-500/10 px-1 py-0.5 text-[9px] text-blue-200">
                                                                                                <Play className="h-3 w-3" /> {summaryCounts['media']}
                                                                                            </div>
                                                                                        )}
                                                                                        {summaryCounts['comment'] > 0 && (
                                                                                            <div className="flex shrink-0 items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] opacity-60">
                                                                                                <Info className="h-3 w-3" /> {summaryCounts['comment']}
                                                                                            </div>
                                                                                        )}
                                                                                        {summaryCounts['action'] > 0 && (
                                                                                            <div className="flex shrink-0 items-center gap-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 px-1 py-0.5 text-[9px] text-yellow-300">
                                                                                                <User className="h-3 w-3" /> {summaryCounts['action']}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {!sequenceReorderMode && (
                                                                                        <button
                                                                                            type="button"
                                                                                            className={cn(SEQUENCE_TREE_MORE_BTN, 'opacity-0 transition-opacity group-hover/event:opacity-100')}
                                                                                            title="Event-acties"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation()
                                                                                                const firstIdx = eventNode.rows[0]?.originalIndex
                                                                                                const lastIdx = eventNode.rows[eventNode.rows.length - 1]?.originalIndex
                                                                                                if (firstIdx === undefined) return
                                                                                                openSequenceTreeMenu(
                                                                                                    e.currentTarget,
                                                                                                    buildEventTreeMenuContent(
                                                                                                        firstIdx,
                                                                                                        lastIdx,
                                                                                                        act.id,
                                                                                                        scene.id ?? 0,
                                                                                                        eventNode.id ?? 0,
                                                                                                        insertEvent,
                                                                                                        addEventBelow,
                                                                                                        setTreeMenu,
                                                                                                        openModal,
                                                                                                        deleteGroup
                                                                                                    )
                                                                                                )
                                                                                            }}
                                                                                        >
                                                                                            <MoreVertical className="h-4 w-4" />
                                                                                        </button>
                                                                                    )}
                                                                                    {sequenceReorderMode && (
                                                                                        <span
                                                                                            data-seq-dnd-grip
                                                                                            role="button"
                                                                                            tabIndex={0}
                                                                                            draggable
                                                                                            title="Event slepen — boven/onder helft van deze balk"
                                                                                            className={cn(SEQUENCE_TREE_DRAG_GRIP, 'opacity-100')}
                                                                                            onDragStart={(e) => {
                                                                                                e.stopPropagation()
                                                                                                setSeqDndSourceKey(eventDndKey)
                                                                                                const payload: SequenceDragPayload = {
                                                                                                    kind: 'event',
                                                                                                    groupStartIndex: eventGroupStartIdx,
                                                                                                }
                                                                                                sequenceTreeDragRef.current = payload
                                                                                                e.dataTransfer.setData(SEQUENCE_DND_MIME, JSON.stringify(payload))
                                                                                                e.dataTransfer.effectAllowed = 'move'
                                                                                            }}
                                                                                            onDragEnd={() => {
                                                                                                sequenceTreeDragRef.current = null
                                                                                            }}
                                                                                        >
                                                                                            <GripVertical className="h-3.5 w-3.5" />
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {(() => {
                                                                            if (hideCompactEventHeader) return null
                                                                            return (
                                                                                <div
                                                                                    className={cn(
                                                                                        'relative flex min-w-0 items-center gap-2 border-b px-3 py-2',
                                                                                        isLocked && eventNode.isActive
                                                                                            ? 'border-green-500/20 bg-green-500/10'
                                                                                            : isLocked && eventNode.isNext
                                                                                              ? 'border-orange-500/20 bg-orange-500/8'
                                                                                              : isCardSelected
                                                                                                ? 'border-blue-500/20 bg-blue-500/8'
                                                                                                : 'border-white/5 bg-black/30',
                                                                                        !isLocked && 'cursor-pointer'
                                                                                    )}
                                                                                    onClick={(e) => {
                                                                                        if (isLocked) return
                                                                                        const t = e.target as HTMLElement
                                                                                        if (t.closest('button') || t.closest('[data-seq-dnd-grip]')) return
                                                                                        setTreeMenu(null)
                                                                                        const tidx = titleRow?.originalIndex ?? eventNode.rows[0]?.originalIndex
                                                                                        if (tidx === undefined) return
                                                                                        setEventEdit({ titleOriginalIndex: tidx })
                                                                                    }}
                                                                                    onDragOver={onEventHeaderDragOver}
                                                                                    onDragLeave={onEventHeaderDragLeave}
                                                                                    onDrop={onEventHeaderDrop}
                                                                                >
                                                                                    {seqDndHover?.targetKey === eventDndKey && seqDndHover.edge === 'before' && (
                                                                                        <div className={cn(TREE_DROP_LINE, 'top-0')} aria-hidden />
                                                                                    )}
                                                                                    {seqDndHover?.targetKey === eventDndKey && seqDndHover.edge === 'after' && (
                                                                                        <div className={cn(TREE_DROP_LINE, 'bottom-0')} aria-hidden />
                                                                                    )}
                                                                                    {hasUnderlyingRows ? (
                                                                                        <div className={TREE_CHEVRON_COL}>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation()
                                                                                                    toggleCollapse(eventNode.uniqueId)
                                                                                                }}
                                                                                                className="rounded p-0.5 hover:bg-white/10"
                                                                                                title={eventCollapsed ? 'Uitklappen' : 'Inklappen'}
                                                                                            >
                                                                                                {eventCollapsed ? <ChevronRight className="h-3.5 w-3.5 opacity-60" /> : <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className={TREE_CHEVRON_COL} aria-hidden />
                                                                                    )}
                                                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                                        {titleRow ? (
                                                                                            !isLocked ? (
                                                                                                <span
                                                                                                    className="min-w-0 flex-1 truncate text-sm font-bold text-orange-400"
                                                                                                    title="Klik om event te bewerken"
                                                                                                >
                                                                                                    {titleRow.event.cue || (
                                                                                                        <span className="text-xs italic text-orange-400/45">Naamloos event</span>
                                                                                                    )}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="min-w-0 flex-1 truncate text-sm font-bold text-orange-400">
                                                                                                    {titleRow.event.cue || (
                                                                                                        <span className="text-xs italic text-orange-400/45">Naamloos event</span>
                                                                                                    )}
                                                                                                </span>
                                                                                            )
                                                                                        ) : (
                                                                                            <span className="min-w-0 flex-1 truncate text-sm font-semibold italic text-orange-400/40">Event</span>
                                                                                        )}
                                                                                        {isLocked && eventNode.isActive && (
                                                                                            <span className="shrink-0 text-[9px] font-black uppercase text-green-400 animate-bright-pulse rounded px-1.5 py-0.5">
                                                                                                Huidig
                                                                                            </span>
                                                                                        )}
                                                                                        {isLocked && eventNode.isNext && (
                                                                                            <span
                                                                                                className={cn(
                                                                                                    'shrink-0 text-[9px] font-black uppercase rounded px-1.5 py-0.5',
                                                                                                    activeTimeElapsed ? 'text-orange-200/80' : 'text-orange-400 animate-bright-pulse'
                                                                                                )}
                                                                                            >
                                                                                                Next
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className={TREE_RIGHT_CLUSTER}>
                                                                                        <div className={TREE_META_RAIL}>
                                                                                            {!isLocked && (
                                                                                                <span className="shrink-0 text-[9px] font-mono opacity-25">
                                                                                                    {(eventNode.rows?.[0]?.event?.sceneId ?? 0)}-{(eventNode.rows?.[0]?.event?.eventId ?? 0)}
                                                                                                </span>
                                                                                            )}
                                                                                            {summaryCounts['light'] > 0 && (
                                                                                                <div className="flex shrink-0 items-center gap-0.5 rounded border border-purple-500/30 bg-purple-500/10 px-1 py-0.5 text-[9px] text-purple-200">
                                                                                                    <Lightbulb className="h-3 w-3" /> {summaryCounts['light']}
                                                                                                </div>
                                                                                            )}
                                                                                            {summaryCounts['media'] > 0 && (
                                                                                                <div className="flex shrink-0 items-center gap-0.5 rounded border border-blue-500/30 bg-blue-500/10 px-1 py-0.5 text-[9px] text-blue-200">
                                                                                                    <Play className="h-3 w-3" /> {summaryCounts['media']}
                                                                                                </div>
                                                                                            )}
                                                                                            {summaryCounts['comment'] > 0 && (
                                                                                                <div className="flex shrink-0 items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] opacity-60">
                                                                                                    <Info className="h-3 w-3" /> {summaryCounts['comment']}
                                                                                                </div>
                                                                                            )}
                                                                                            {summaryCounts['action'] > 0 && (
                                                                                                <div className="flex shrink-0 items-center gap-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 px-1 py-0.5 text-[9px] text-yellow-300">
                                                                                                    <User className="h-3 w-3" /> {summaryCounts['action']}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {!isLocked && (
                                                                                            <>
                                                                                                {!sequenceReorderMode && (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className={cn(SEQUENCE_TREE_MORE_BTN, 'opacity-0 transition-opacity group-hover/event:opacity-100')}
                                                                                                        title="Event-acties"
                                                                                                        onClick={e => {
                                                                                                            e.stopPropagation()
                                                                                                            const firstIdx = eventNode.rows[0]?.originalIndex
                                                                                                            const lastIdx = eventNode.rows[eventNode.rows.length - 1]?.originalIndex
                                                                                                            if (firstIdx === undefined) return
                                                                                                            openSequenceTreeMenu(
                                                                                                                e.currentTarget,
                                                                                                                buildEventTreeMenuContent(
                                                                                                                    firstIdx,
                                                                                                                    lastIdx,
                                                                                                                    act.id,
                                                                                                                    scene.id ?? 0,
                                                                                                                    eventNode.id ?? 0,
                                                                                                                    insertEvent,
                                                                                                                    addEventBelow,
                                                                                                                    setTreeMenu,
                                                                                                                    openModal,
                                                                                                                    deleteGroup
                                                                                                                )
                                                                                                            )
                                                                                                        }}
                                                                                                    >
                                                                                                        <MoreVertical className="h-4 w-4" />
                                                                                                    </button>
                                                                                                )}
                                                                                                {sequenceReorderMode && (
                                                                                                    <span
                                                                                                        data-seq-dnd-grip
                                                                                                        role="button"
                                                                                                        tabIndex={0}
                                                                                                        draggable
                                                                                                        title="Event slepen — boven/onder helft van deze balk"
                                                                                                        className={cn(SEQUENCE_TREE_DRAG_GRIP, 'opacity-100')}
                                                                                                        onDragStart={e => {
                                                                                                            e.stopPropagation()
                                                                                                            setSeqDndSourceKey(eventDndKey)
                                                                                                            const payload: SequenceDragPayload = {
                                                                                                                kind: 'event',
                                                                                                                groupStartIndex: eventGroupStartIdx,
                                                                                                            }
                                                                                                            sequenceTreeDragRef.current = payload
                                                                                                            e.dataTransfer.setData(SEQUENCE_DND_MIME, JSON.stringify(payload))
                                                                                                            e.dataTransfer.effectAllowed = 'move'
                                                                                                        }}
                                                                                                        onDragEnd={() => {
                                                                                                            sequenceTreeDragRef.current = null
                                                                                                        }}
                                                                                                    >
                                                                                                        <GripVertical className="h-3.5 w-3.5" />
                                                                                                    </span>
                                                                                                )}
                                                                                            </>
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
                                                                                        isActiveGroup={!!isLocked && eventNode.isActive}
                                                                                        isNextGroup={!!isLocked && eventNode.isNext}
                                                                                        handleRowClick={handleRowClick}
                                                                                        handleRowDoubleClick={handleRowDoubleClick}
                                                                                        onRequestEditRow={setEditRowIndex}
                                                                                        isRowSelected={selectedEventIndex === item.originalIndex}
                                                                                        menuOpenIndex={menuOpenIndex}
                                                                                        setMenuOpenIndex={setMenuOpenIndex}
                                                                                        isLocked={isLocked}
                                                                                        activeEventIndex={activeEventIndex}
                                                                                        eventStatuses={eventStatuses}
                                                                                        selectedEventIndex={selectedEventIndex}
                                                                                        selectedEvent={selectedEvent}
                                                                                        ongoingEffects={eventNode.ongoingEffects}
                                                                                        sequenceReorderMode={sequenceReorderMode}
                                                                                        actionRowDnD={buildActionRowDnD(item.originalIndex, item.event)}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Show + ingeklapt: lamp-peeks + projectie-media strip (bediening op actief event) */}
                                                                        {isLocked &&
                                                                            eventCollapsed &&
                                                                            (() => {
                                                                                const techPeekRows = collapsibleRows.filter(
                                                                                    r => {
                                                                                        const t = r.event.type?.toLowerCase()
                                                                                        if (t === 'light') {
                                                                                            const d =
                                                                                                gridDevices.find(
                                                                                                    x =>
                                                                                                        x.name ===
                                                                                                        r.event.fixture
                                                                                                )
                                                                                            return (
                                                                                                d?.type === 'wled' ||
                                                                                                d?.type === 'wiz'
                                                                                            )
                                                                                        }
                                                                                        if (t === 'media')
                                                                                            return isCollapsedShowProjectionMediaRow(
                                                                                                r.event,
                                                                                                gridDevices
                                                                                            )
                                                                                        return false
                                                                                    }
                                                                                )
                                                                                if (techPeekRows.length === 0)
                                                                                    return null
                                                                                return (
                                                                                    <div className="space-y-0.5 border-t border-white/5 bg-violet-950/15 py-0.5 pl-14 pr-4">
                                                                                        {techPeekRows.map(item => (
                                                                                            <div
                                                                                                key={`collapsed-tech-${item.id}`}
                                                                                                className="min-w-0"
                                                                                                onClick={e =>
                                                                                                    e.stopPropagation()
                                                                                                }
                                                                                            >
                                                                                                <ShowCollapsedTechRow
                                                                                                    event={item.event}
                                                                                                    originalIndex={
                                                                                                        item.originalIndex
                                                                                                    }
                                                                                                    gridDevices={
                                                                                                        gridDevices
                                                                                                    }
                                                                                                    wledPeekPlaceholder={wledPeekPlaceholderForRow(
                                                                                                        isLocked,
                                                                                                        eventNode,
                                                                                                        item.event,
                                                                                                        item.originalIndex,
                                                                                                        gridDevices
                                                                                                    )}
                                                                                                    lightStripPreviewOn={
                                                                                                        lightStripPreviewOn
                                                                                                    }
                                                                                                    showActions={
                                                                                                        !!eventNode.isActive
                                                                                                    }
                                                                                                />
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )
                                                                            })()}

                                                                        {/* ═══ COLLAPSIBLE ROWS (Light + media; projector/videowall media = compact in show mode) ═══ */}
                                                                        {!eventCollapsed && (detailCollapsibleRows.length > 0 || compactProjectionMediaRows.length > 0) && (
                                                                            <div className="flex flex-col divide-y divide-white/5 border-t border-white/5">
                                                                                {(() => {
                                                                                    const usedFixtures = eventNode.rows.map(r => r.event.fixture).filter(Boolean)
                                                                                    const base = alwaysVisibleRows.length
                                                                                    return (
                                                                                        <>
                                                                                            {detailCollapsibleRows.map((item, idx) => (
                                                                                                <RowItem
                                                                                                    key={`row-${item.id}`}
                                                                                                    event={{ ...item.event, usedFixtures } as any}
                                                                                                    originalIndex={item.originalIndex}
                                                                                                    id={item.id}
                                                                                                    isShadow={item.isShadow}
                                                                                                    zebraIndex={base + idx}
                                                                                                    isNextGroup={!!isLocked && eventNode.isNext}
                                                                                                    isActiveGroup={!!isLocked && eventNode.isActive}
                                                                                                    handleRowClick={handleRowClick}
                                                                                                    handleRowDoubleClick={handleRowDoubleClick}
                                                                                                    onRequestEditRow={setEditRowIndex}
                                                                                                    isRowSelected={selectedEventIndex === item.originalIndex}
                                                                                                    menuOpenIndex={menuOpenIndex}
                                                                                                    setMenuOpenIndex={setMenuOpenIndex}
                                                                                                    isLocked={isLocked}
                                                                                                    activeEventIndex={activeEventIndex}
                                                                                                    eventStatuses={eventStatuses}
                                                                                                    selectedEventIndex={selectedEventIndex}
                                                                                                    selectedEvent={selectedEvent}
                                                                                                    ongoingEffects={eventNode.ongoingEffects}
                                                                                                    wledPeekPlaceholder={wledPeekPlaceholderForRow(
                                                                                                        isLocked,
                                                                                                        eventNode,
                                                                                                        item.event,
                                                                                                        item.originalIndex,
                                                                                                        gridDevices
                                                                                                    )}
                                                                                                    sequenceReorderMode={sequenceReorderMode}
                                                                                                    actionRowDnD={buildActionRowDnD(item.originalIndex, item.event)}
                                                                                                />
                                                                                            ))}
                                                                                            {compactProjectionMediaRows.map((item, idx) => (
                                                                                                <RowItem
                                                                                                    key={`row-compact-${item.id}`}
                                                                                                    event={{ ...item.event, usedFixtures } as any}
                                                                                                    originalIndex={item.originalIndex}
                                                                                                    id={item.id}
                                                                                                    isShadow={item.isShadow}
                                                                                                    zebraIndex={base + detailCollapsibleRows.length + idx}
                                                                                                    isNextGroup={!!isLocked && eventNode.isNext}
                                                                                                    isActiveGroup={!!isLocked && eventNode.isActive}
                                                                                                    handleRowClick={handleRowClick}
                                                                                                    handleRowDoubleClick={handleRowDoubleClick}
                                                                                                    onRequestEditRow={setEditRowIndex}
                                                                                                    isRowSelected={selectedEventIndex === item.originalIndex}
                                                                                                    menuOpenIndex={menuOpenIndex}
                                                                                                    setMenuOpenIndex={setMenuOpenIndex}
                                                                                                    isLocked={isLocked}
                                                                                                    activeEventIndex={activeEventIndex}
                                                                                                    eventStatuses={eventStatuses}
                                                                                                    selectedEventIndex={selectedEventIndex}
                                                                                                    selectedEvent={selectedEvent}
                                                                                                    ongoingEffects={eventNode.ongoingEffects}
                                                                                                    wledPeekPlaceholder={wledPeekPlaceholderForRow(
                                                                                                        isLocked,
                                                                                                        eventNode,
                                                                                                        item.event,
                                                                                                        item.originalIndex,
                                                                                                        gridDevices
                                                                                                    )}
                                                                                                    showModeMediaCompact
                                                                                                    sequenceReorderMode={sequenceReorderMode}
                                                                                                    actionRowDnD={buildActionRowDnD(item.originalIndex, item.event)}
                                                                                                />
                                                                                            ))}
                                                                                        </>
                                                                                    )
                                                                                })()}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ═══ TRANSITION STRIP between events ═══ */}
                                                                    <div ref={scrollTransitionRef} className="min-h-0">
                                                                        <EventTransition
                                                                            triggerEvent={triggerRow?.event || null}
                                                                            isLastEvent={isLastEvent}
                                                                            isLocked={isLocked}
                                                                            isPast={isLocked && !!eventNode.isPast}
                                                                            precedingGroupActive={!!eventNode.isActive}
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
            </div>

            {transitionEditIndex !== null && !isLocked && (
                <TransitionEditModal
                    triggerIndex={transitionEditIndex}
                    onClose={() => setTransitionEditIndex(null)}
                />
            )}
            {editRowIndex !== null && !isLocked && (
                <SequenceRowEditModal
                    rowIndex={editRowIndex}
                    onClose={() => setEditRowIndex(null)}
                />
            )}
            {actEditActId !== null && !isLocked && (
                <ActEditModal actId={actEditActId} onClose={() => setActEditActId(null)} />
            )}
            {sceneEdit !== null && !isLocked && (
                <SceneEditModal sceneEdit={sceneEdit} onClose={() => setSceneEdit(null)} />
            )}
            {eventEdit !== null && !isLocked && (
                <EventEditModal eventEdit={eventEdit} onClose={() => setEventEdit(null)} />
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
        </div>
    )
}

export default SequenceGrid
