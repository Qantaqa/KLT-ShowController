import type { StateCreator } from 'zustand';
import { type ShowState } from '../types';
import type { ShowEvent, ClipboardItem } from '../../types/show';
import { networkService } from '../../services/network-service';
import { transitionKeyFromGroupEvent } from '../../utils/transitionTiming';
import {
    ensureStableSequenceIds,
    splitEventsIntoActBlocks,
    stableSceneMetaKey,
    collapseStorageActKeyFromEvent,
    collapseStorageSceneKeyFromEvent,
    collapseStorageEventKeyFromEvent,
} from '../../lib/sequenceStableIds';

function buildIndexRemap(oldEvents: ShowEvent[], newEvents: ShowEvent[]): Map<number, number> {
    const map = new Map<number, number>();
    for (let ni = 0; ni < newEvents.length; ni++) {
        const ne = newEvents[ni]
        const oi =
            ne.uid != null && ne.uid !== ''
                ? oldEvents.findIndex(e => e.uid === ne.uid)
                : oldEvents.indexOf(ne)
        if (oi !== -1) map.set(oi, ni);
    }
    return map;
}

/** actUid (uuid) of legacy weergavenaam */
function eventMatchesActScope(e: ShowEvent, actScope: string): boolean {
    if (!actScope) return false
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actScope)
    return uuidLike ? e.actUid === actScope : e.act === actScope
}

function remapOptionalIndex(i: number, m: Map<number, number>): number {
    if (i < 0) return i;
    return m.has(i) ? m.get(i)! : i;
}

type ActInteriorSeg =
    | { kind: 'orphan'; rows: ShowEvent[] }
    | { kind: 'scene'; sceneId: number; rows: ShowEvent[] }
    | { kind: 'other'; rows: ShowEvent[] };

function parseActRowsToSegments(rows: ShowEvent[]): ActInteriorSeg[] {
    const segments: ActInteriorSeg[] = [];
    let i = 0;
    while (i < rows.length) {
        const e = rows[i];
        const t = (e.type || '').toLowerCase();
        if (e.sceneId === undefined && e.eventId === undefined && t !== 'scene') {
            let j = i + 1;
            while (j < rows.length) {
                const e2 = rows[j];
                const t2 = (e2.type || '').toLowerCase();
                if (!(e2.sceneId === undefined && e2.eventId === undefined && t2 !== 'scene')) break;
                j++;
            }
            segments.push({ kind: 'orphan', rows: rows.slice(i, j) });
            i = j;
            continue;
        }
        if (e.sceneId !== undefined) {
            const sid = e.sceneId;
            const act = e.act;
            let j = i;
            while (j < rows.length && rows[j].act === act && rows[j].sceneId === sid) j++;
            segments.push({ kind: 'scene', sceneId: sid, rows: rows.slice(i, j) });
            i = j;
            continue;
        }
        segments.push({ kind: 'other', rows: rows.slice(i, i + 1) });
        i++;
    }
    return segments;
}

function reorderSceneSegmentsInPlace(segments: ActInteriorSeg[], draggedId: number, targetId: number): ActInteriorSeg[] {
    const sceneSegs = segments.filter((s): s is Extract<ActInteriorSeg, { kind: 'scene' }> => s.kind === 'scene');
    if (!sceneSegs.length) return segments;
    const ids = sceneSegs.map(s => s.sceneId);
    const di = ids.indexOf(draggedId);
    const ti = ids.indexOf(targetId);
    if (di === -1 || ti === -1 || di === ti) return segments;
    const newIds = [...ids];
    newIds.splice(di, 1);
    const nti = newIds.indexOf(targetId);
    newIds.splice(nti, 0, draggedId);
    const byId = new Map(sceneSegs.map(s => [s.sceneId, s] as const));
    const newSceneList = newIds.map(id => byId.get(id)!);
    let si = 0;
    return segments.map(seg => (seg.kind === 'scene' ? newSceneList[si++] : seg));
}

export interface SequenceSlice {
    events: ShowEvent[];
    activeEventIndex: number;
    selectedEventIndex: number;
    isLocked: boolean;
    freezeRuntimeCollapsedGroups: boolean;
    blinkingNextEvent: boolean;
    blinkingNextScene: boolean;
    blinkingNextAct: boolean;
    isTimeTracking: boolean;
    autoFollowScript: boolean;
    navigationWarning: 'event' | 'scene' | 'act' | null;
    lastTransitionTime: number | null;
    /** Wall-clock ms when the current show run started (`startShow`); used as execution id for `show_timing`. */
    timingRunStartedAt: number | null;
    /** Escape during show: highlight Stop until user clicks it (does not stop on Escape). */
    stopButtonFlashRequest: boolean;
    showStartTime: string;
    actualStartTime: number | null;
    isPaused: boolean;
    pauseStartTime: number | null;
    runtimeCollapsedGroups: Record<string, boolean>;
    eventStatuses: Record<number, 'sending' | 'ok' | 'failed' | null>;
    clipboard: ClipboardItem[];
    /** Per `transitionKey` (act|sceneId|eventId): all `durationSec` from `show_timing`, chronological by run. */
    showTimingDurationsByKey: Record<string, number[]>;
    /** Load `show_timing` for the active show into `showTimingDurationsByKey`. */
    refreshShowTimingFromDb: () => Promise<void>;
    /** Edit mode: remove all DB + in-sequence samples for this transition trigger. */
    clearTransitionTimingData: (triggerIndex: number) => Promise<void>;
    /** Edit mode: replace all samples with one reference duration (seconds); clears DB rows for this key first. */
    setTransitionTimingReferenceSec: (triggerIndex: number, durationSec: number) => Promise<void>;

    setEvents: (events: ShowEvent[]) => void;
    setShowStartTime: (time: string) => void;
    setActiveEvent: (index: number) => void;
    startShow: () => void;
    /** Geen actief event tot Play; wis timing; reset stagehand-vinkjes. Aanroepen vóór setLocked(true) bij edit→show. */
    resetPlaybackForShowMode: () => void;
    setSelectedEvent: (index: number) => void;
    setStopButtonFlashRequest: (on: boolean) => void;
    setLocked: (locked: boolean) => Promise<void>;
    nextEvent: (force?: boolean) => void;
    nextScene: (force?: boolean) => void;
    nextAct: (force?: boolean) => void;
    updateBlinkRecommendations: (activeIndex: number) => void;
    toggleCollapse: (id: string) => void;
    collapseAll: () => void;
    expandAll: () => void;
    toggleTimeTracking: () => void;
    togglePause: () => void;
    toggleAutoFollowScript: () => void;

    // Manipulation
    addEventAbove: (index: number, type?: string, cue?: string) => void;
    addEventBelow: (index: number, type?: string, cue?: string) => void;
    insertAct: (index: number, position: 'before' | 'after') => void;
    insertScene: (index: number, position: 'before' | 'after') => void;
    insertEvent: (index: number, position: 'before' | 'after') => void;
    /** Hernoem alleen de zichtbare titel; actUid blijft gelijk. */
    renameAct: (actUid: string, newName: string) => Promise<boolean>;
    renameScene: (actName: string, sceneId: number, newDescription: string) => void;
    moveAct: (actName: string, direction: 'up' | 'down') => void;
    moveScene: (actName: string, sceneId: number, direction: 'up' | 'down') => void;
    moveEvent: (index: number, direction: 'up' | 'down') => void;
    /** Sleep: hele act-blok direct vóór een andere act. */
    reorderActBefore: (draggedActUid: string, targetActUid: string) => void;
    /** Sleep: scene (met events) binnen dezelfde act vóór een andere scene. */
    reorderSceneBefore: (actName: string, draggedSceneId: number, targetSceneId: number) => void;
    /** Verplaats een volledige scene (incl. events/acties) naar een andere bestaande act (achteraan die act). */
    moveSceneToAct: (fromAct: string, fromSceneId: number, toAct: string) => Promise<void>;
    /** Sleep: event-groep binnen dezelfde scene vóór de groep die op beforeTargetIndex begint. */
    moveEventGroupBefore: (fromGroupStartIndex: number, beforeTargetIndex: number) => void;
    /** Sleep: event-groep direct ná de groep die op afterTargetGroupStartIndex begint. */
    moveEventGroupAfter: (fromGroupStartIndex: number, afterTargetGroupStartIndex: number) => void;
    /** Sleep: één action-regel binnen dezelfde event-groep vóór of ná een andere action-regel. */
    moveActionRowWithinGroup: (fromIndex: number, toIndex: number, edge: 'before' | 'after') => void;
    deleteEvent: (index: number) => void;
    deleteGroup: (act: string, sceneId: number, eventId: number) => void;
    deleteAct: (act: string) => void;
    deleteScene: (act: string, sceneId: number) => void;
    addCommentToEvent: (index: number) => void;
    addActComment: (actUid: string) => void;
    addSceneComment: (actUid: string, sceneId: number) => void;
    updateEvent: (index: number, partial: Partial<ShowEvent>) => void;
    /** Show-modus: als trigger `actions_complete` is en alle stagehand-acties zijn afgevinkt → nextEvent(true). Optioneel: alleen als `updatedRowIndex` een actie in de actieve groep is. */
    maybeAdvanceOnAllActionsComplete: (updatedRowIndex?: number) => void;
    /** Set by PdfViewer markers; SequenceGrid opens SequenceRowEditModal when unlocked. */
    rowEditRequestFromPdfMarker: number | null;
    requestRowEditFromPdfMarker: (rowIndex: number) => void;
    clearRowEditRequestFromPdfMarker: () => void;
    resendEvent: (index: number) => void;
    reindexEvents: () => void;

    // Clipboard
    copyToClipboard: (event: ShowEvent) => Promise<void>;
    loadClipboard: () => Promise<void>;
    removeFromClipboard: (id: number) => Promise<void>;
    clearClipboard: () => Promise<void>;
    pasteEvent: (index: number, partialData: Partial<ShowEvent>) => void;
}

export const createSequenceSlice: StateCreator<
    ShowState,
    [],
    [],
    SequenceSlice
> = (set, get) => ({
    events: [],
    activeEventIndex: -1,
    selectedEventIndex: -1,
    isLocked: true,
    freezeRuntimeCollapsedGroups: false,
    blinkingNextEvent: false,
    blinkingNextScene: false,
    blinkingNextAct: false,
    isTimeTracking: false,
    autoFollowScript: true,
    navigationWarning: null,
    lastTransitionTime: null,
    timingRunStartedAt: null,
    stopButtonFlashRequest: false,
    showStartTime: "19:30",
    actualStartTime: null,
    isPaused: false,
    pauseStartTime: null,
    runtimeCollapsedGroups: {},
    eventStatuses: {},
    clipboard: [],
    showTimingDurationsByKey: {},
    rowEditRequestFromPdfMarker: null,

    requestRowEditFromPdfMarker: (rowIndex: number) => set({ rowEditRequestFromPdfMarker: rowIndex }),
    clearRowEditRequestFromPdfMarker: () => set({ rowEditRequestFromPdfMarker: null }),

    refreshShowTimingFromDb: async () => {
        const { activeShow } = get()
        if (!activeShow?.id || !(window as any).require) {
            set({ showTimingDurationsByKey: {} })
            return
        }
        try {
            const { ipcRenderer } = (window as any).require('electron')
            const rows = (await ipcRenderer.invoke('db:get-show-timings', {
                showId: activeShow.id
            })) as { transitionKey: string; durationSec: number; runAt: string }[]
            const sorted = [...(rows || [])].sort(
                (a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime()
            )
            const map: Record<string, number[]> = {}
            for (const r of sorted) {
                if (!map[r.transitionKey]) map[r.transitionKey] = []
                map[r.transitionKey].push(r.durationSec)
            }
            set({ showTimingDurationsByKey: map })
        } catch (e) {
            console.warn('refreshShowTimingFromDb failed', e)
        }
    },

    clearTransitionTimingData: async (triggerIndex: number) => {
        const { events, activeShow, setEvents, saveCurrentShow, refreshShowTimingFromDb } = get()
        const ev = events[triggerIndex]
        if (!ev || (ev.type || '').toLowerCase() !== 'trigger') return
        const key = transitionKeyFromGroupEvent(ev)
        if (activeShow?.id && (window as any).require) {
            try {
                const { ipcRenderer } = (window as any).require('electron')
                await ipcRenderer.invoke('db:delete-show-timing-for-transition', {
                    showId: activeShow.id,
                    transitionKey: key
                })
            } catch (e) {
                console.warn('delete show_timing for transition failed', e)
            }
        }
        const newEvents = [...events]
        newEvents[triggerIndex] = { ...ev, timingSamples: undefined }
        setEvents(newEvents)
        await saveCurrentShow()
        await refreshShowTimingFromDb()
    },

    setTransitionTimingReferenceSec: async (triggerIndex: number, durationSec: number) => {
        const sec = Math.max(0, Math.round(durationSec))
        const { events, activeShow, setEvents, saveCurrentShow, refreshShowTimingFromDb } = get()
        const ev = events[triggerIndex]
        if (!ev || (ev.type || '').toLowerCase() !== 'trigger') return
        const key = transitionKeyFromGroupEvent(ev)
        if (activeShow?.id && (window as any).require) {
            try {
                const { ipcRenderer } = (window as any).require('electron')
                await ipcRenderer.invoke('db:delete-show-timing-for-transition', {
                    showId: activeShow.id,
                    transitionKey: key
                })
            } catch (e) {
                console.warn('delete show_timing for transition failed', e)
            }
        }
        const newEvents = [...events]
        newEvents[triggerIndex] = {
            ...ev,
            timingSamples: sec > 0 ? [sec] : undefined
        }
        setEvents(newEvents)
        await saveCurrentShow()
        await refreshShowTimingFromDb()
    },

    setEvents: (events) => set({ events: ensureStableSequenceIds(events) }),
    setShowStartTime: (showStartTime) => set({ showStartTime }),
    setActiveEvent: (index) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'setActiveEvent', index })
            return
        }
        const { events, activeEventIndex, actualStartTime, isPaused, isTimeTracking, lastTransitionTime, isLocked, stopMediaAt, saveCurrentShow, autoFollowScript, setCurrentScriptPage, updateBlinkRecommendations, broadcastState, activeShow, timingRunStartedAt } = get()
        if (index === -1) {
            set({
                activeEventIndex: -1,
                navigationWarning: null,
                blinkingNextEvent: false,
                blinkingNextScene: false,
                blinkingNextAct: false,
                isPaused: false,
                pauseStartTime: null,
                actualStartTime: null,
                lastTransitionTime: null,
                timingRunStartedAt: null,
                stopButtonFlashRequest: false
            })
            broadcastState()
            return
        }
        if (index < 0 || index >= events.length) return
        const groupKey = (e: ShowEvent) => `${e.act}|${e.sceneId ?? 0}|${e.eventId ?? 0}`

        let newEvents = events
        let newLastTransitionTime = lastTransitionTime
        if (isTimeTracking) {
            const now = Date.now()
            if (lastTransitionTime !== null && activeEventIndex !== -1 && activeEventIndex < events.length) {
                const fromEv = events[activeEventIndex]
                const toEv = events[index]
                if (groupKey(fromEv) !== groupKey(toEv)) {
                    const durationSec = Math.round((now - lastTransitionTime) / 1000)
                    if (durationSec > 0) {
                        const ti = events.findIndex(e =>
                            e.act === fromEv.act &&
                            (e.sceneId ?? 0) === (fromEv.sceneId ?? 0) &&
                            (e.eventId ?? 0) === (fromEv.eventId ?? 0) &&
                            (e.type || '').toLowerCase() === 'trigger'
                        )
                        if (ti !== -1) {
                            const tr = events[ti]
                            const samples = [...(tr.timingSamples || []), durationSec]
                            newEvents = [...events]
                            newEvents[ti] = { ...tr, timingSamples: samples }
                            const transitionKey = transitionKeyFromGroupEvent(fromEv)
                            if (activeShow?.id && timingRunStartedAt != null) {
                                try {
                                    const { ipcRenderer } = (window as any).require('electron')
                                    void ipcRenderer
                                        .invoke('db:insert-show-timing', {
                                            showId: activeShow.id,
                                            runAt: new Date(timingRunStartedAt).toISOString(),
                                            transitionKey,
                                            durationSec
                                        })
                                        .then(() => get().refreshShowTimingFromDb())
                                        .catch((err: unknown) => console.warn('show_timing insert failed', err))
                                } catch (e) {
                                    console.warn('show_timing insert failed', e)
                                }
                            }
                        }
                    }
                }
            }
        }
        newLastTransitionTime = Date.now()
        const prevEvent = activeEventIndex >= 0 ? events[activeEventIndex] : null
        let stepEvents = newEvents
        const curTmp = stepEvents[index]
        const isNewEventGroup = !prevEvent ||
            prevEvent.act !== curTmp.act ||
            prevEvent.sceneId !== curTmp.sceneId ||
            prevEvent.eventId !== curTmp.eventId

        if (isHost && isLocked && isNewEventGroup && prevEvent) {
            const pk = groupKey(prevEvent)
            const needComplete = stepEvents.some(
                e =>
                    (e.type || '').toLowerCase() === 'action' &&
                    groupKey(e) === pk &&
                    !e.actionCompleted
            )
            if (needComplete) {
                stepEvents = stepEvents.map(e => {
                    if ((e.type || '').toLowerCase() !== 'action' || groupKey(e) !== pk) return e
                    return { ...e, actionCompleted: true }
                })
            }
        }
        newEvents = stepEvents
        const currentEvent = newEvents[index]

        const updates: any = {
            events: newEvents,
            activeEventIndex: index,
            navigationWarning: null,
            lastTransitionTime: newLastTransitionTime
        }

        // --- Auto-stop / Auto-trigger Logic (Show mode only) ---
        // Important: this only runs on the host (Electron) while locked (Show mode),
        // and only when we ENTER a *new* event group (act/sceneId/eventId changes).
        //
        // Stop logic:
        // - A media/light row can declare a stop marker via stopAct/stopSceneId/stopEventId (set in the grid UI).
        // - When we enter that stop event group, `stopMediaAt(...)` fades out and stops playback on the target device(s).
        if (isHost && isLocked && isNewEventGroup) {
            // Stop media whose stop marker matches this group
            stopMediaAt(currentEvent.act, currentEvent.sceneId ?? 0, currentEvent.eventId ?? 0)

            newEvents.forEach((e, i) => {
                if (e.act === currentEvent.act && e.sceneId === currentEvent.sceneId && e.eventId === currentEvent.eventId) {
                    const type = e.type?.toLowerCase()
                    if (type === 'media' && e.filename) {
                        // Use setTimeout to avoid potential state update conflicts during set()
                        setTimeout(() => get().restartMedia(i), 50);
                    } else if (type === 'light' && e.fixture) {
                        setTimeout(() => networkService.sendCommand({ type: 'EVENT_TRIGGER', event: e }), 50);
                    }
                }
            })
        }

        if (newEvents !== events) saveCurrentShow()
        if (!actualStartTime && currentEvent.act === 'Act 1' && currentEvent.sceneId === 1 && currentEvent.eventId === 1) {
            updates.actualStartTime = Date.now()
        }
        if (currentEvent.cue?.toUpperCase().includes('PAUZE')) {
            if (!isPaused) {
                updates.isPaused = true
                updates.pauseStartTime = Date.now()
            }
        } else {
            updates.isPaused = false
            updates.pauseStartTime = null
        }
        if (isLocked) {
            const allGroupKeys = new Set<string>()
            newEvents.forEach((e: ShowEvent) => {
                allGroupKeys.add(collapseStorageActKeyFromEvent(e))
                if (e.sceneId !== undefined) {
                    allGroupKeys.add(collapseStorageSceneKeyFromEvent(e))
                }
            })
            const nextRuntimeCollapsed: Record<string, boolean> = {}
            allGroupKeys.forEach(k => {
                nextRuntimeCollapsed[k] = true
            })
            nextRuntimeCollapsed[collapseStorageActKeyFromEvent(currentEvent)] = false
            nextRuntimeCollapsed[collapseStorageSceneKeyFromEvent(currentEvent)] = false
            let nextGroupIdx = -1
            for (let i = index + 1; i < newEvents.length; i++) {
                const e = newEvents[i]
                if (e.act !== currentEvent.act || e.sceneId !== currentEvent.sceneId || e.eventId !== currentEvent.eventId) {
                    nextGroupIdx = i
                    break
                }
            }
            if (nextGroupIdx !== -1) {
                const nextE = newEvents[nextGroupIdx]
                let nextSceneId = nextE.sceneId ?? 0
                if (nextSceneId === 0) {
                    for (let j = nextGroupIdx; j < newEvents.length; j++) {
                        const e = newEvents[j]
                        if (!e) continue
                        if (e.act !== nextE.act) break
                        const sid = e.sceneId ?? 0
                        if (sid > 0) {
                            nextSceneId = sid
                            break
                        }
                    }
                }
                nextRuntimeCollapsed[collapseStorageActKeyFromEvent(nextE)] = false
                const nextRowForScene =
                    newEvents.find(
                        (row, j) =>
                            j >= nextGroupIdx &&
                            row.actUid === nextE.actUid &&
                            (row.sceneId ?? 0) === nextSceneId
                    ) || nextE
                nextRuntimeCollapsed[collapseStorageSceneKeyFromEvent(nextRowForScene)] = false
            }
            const groupCollapseKey = (e: ShowEvent) => collapseStorageEventKeyFromEvent(e)
            const activeUid = groupCollapseKey(currentEvent)
            let nextUid: string | null = null
            if (nextGroupIdx !== -1) {
                nextUid = groupCollapseKey(newEvents[nextGroupIdx])
            }
            const eventGroupUids = new Set<string>()
            newEvents.forEach((e: ShowEvent) => eventGroupUids.add(groupCollapseKey(e)))
            // Show-modus: actieve cue standaard ingeklapt (alleen stagehand + minimale light/media);
            // volgende cue blijft uitgeklapt voor visie op wat komt; overige groepen dicht.
            eventGroupUids.forEach((u) => {
                if (u === activeUid) nextRuntimeCollapsed[u] = true
                else nextRuntimeCollapsed[u] = u !== nextUid
            })
            updates.runtimeCollapsedGroups = nextRuntimeCollapsed
        }
        updates.stopButtonFlashRequest = false
        set(updates)
        if (isLocked && autoFollowScript) {
            let pageToJump = currentEvent.scriptPg
            if (!pageToJump || pageToJump <= 0) {
                const header = newEvents.slice(0, index + 1).reverse().find(e =>
                    e.type === 'Act' || e.type === 'Scene'
                )
                if (header) pageToJump = header.scriptPg
            }
            if (pageToJump && pageToJump > 0) setCurrentScriptPage(pageToJump)
        }
        updateBlinkRecommendations(index)
        broadcastState()
    },

    startShow: () => {
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'startShow' })
            return
        }
        const { setEvents, saveCurrentShow, setActiveEvent } = get()
        set({ timingRunStartedAt: Date.now(), stopButtonFlashRequest: false })

        const events = get().events
        if (!events || events.length === 0) return

        const cleared = events.map(e =>
            (e.type || '').toLowerCase() === 'action'
                ? { ...e, actionCompleted: undefined }
                : e
        )
        const changed = cleared.some((e, i) => e !== events[i])
        if (changed) {
            setEvents(cleared)
            void saveCurrentShow()
        }

        const eventsAfter = get().events
        if (!eventsAfter || eventsAfter.length === 0) return

        // Always start at the very first act/scene/event group (often pre-show).
        const firstActName = eventsAfter.find(e => e && e.act)?.act
        if (!firstActName) return

        const sceneIdFor = (e: ShowEvent) => (e.sceneId ?? 0)
        const eventIdFor = (e: ShowEvent) => (e.eventId ?? 0)

        const candidates = eventsAfter.filter(e => e && e.act === firstActName)
        if (candidates.length === 0) return

        const minPositiveScene = Math.min(...candidates.map(e => sceneIdFor(e)).filter(n => n > 0))
        const targetSceneId = Number.isFinite(minPositiveScene) ? minPositiveScene : Math.min(...candidates.map(e => sceneIdFor(e)))

        const inTargetScene = candidates.filter(e => sceneIdFor(e) === targetSceneId)
        const minPositiveEvent = Math.min(...inTargetScene.map(e => eventIdFor(e)).filter(n => n > 0))
        const targetEventId = Number.isFinite(minPositiveEvent) ? minPositiveEvent : Math.min(...inTargetScene.map(e => eventIdFor(e)))

        const titleIdx = eventsAfter.findIndex(e =>
            e.act === firstActName &&
            (e.sceneId ?? 0) === targetSceneId &&
            (e.eventId ?? 0) === targetEventId &&
            (e.type || '').toLowerCase() === 'title'
        )
        if (titleIdx !== -1) {
            setActiveEvent(titleIdx)
            return
        }
        const firstGroupIdx = eventsAfter.findIndex(e =>
            e.act === firstActName &&
            (e.sceneId ?? 0) === targetSceneId &&
            (e.eventId ?? 0) === targetEventId
        )
        if (firstGroupIdx !== -1) setActiveEvent(firstGroupIdx)
    },

    resetPlaybackForShowMode: () => {
        const { events, setEvents, saveCurrentShow, broadcastState } = get()
        const cleared = events.map((e: ShowEvent) =>
            (e.type || '').toLowerCase() === 'action'
                ? { ...e, actionCompleted: undefined }
                : e
        )
        const changed = cleared.some((e, i) => e !== events[i])
        if (changed) {
            setEvents(cleared)
            void saveCurrentShow()
        }
        set({
            activeEventIndex: -1,
            selectedEventIndex: -1,
            navigationWarning: null,
            lastTransitionTime: null,
            isPaused: false,
            pauseStartTime: null,
            timingRunStartedAt: null,
            actualStartTime: null,
            blinkingNextEvent: false,
            blinkingNextScene: false,
            blinkingNextAct: false,
            stopButtonFlashRequest: false,
        })
        broadcastState()
    },

    setSelectedEvent: (index) => set({ selectedEventIndex: index }),

    setStopButtonFlashRequest: (on: boolean) => set({ stopButtonFlashRequest: on }),

    setLocked: async (isLocked) => {
        const { activeShow, events, activeEventIndex, saveCurrentShow, broadcastState } = get()
        set({ isLocked, freezeRuntimeCollapsedGroups: false, ...(!isLocked ? { stopButtonFlashRequest: false } : {}) })
        broadcastState()

        if (isLocked) {
            await saveCurrentShow()
            const targetIndex = activeEventIndex >= 0 ? activeEventIndex : 0
            if (events && events.length > 0) {
                const target = events[targetIndex]
                const actKey = collapseStorageActKeyFromEvent(target)
                const sceneKey = collapseStorageSceneKeyFromEvent(target)
                const newRuntimeCollapsed: Record<string, boolean> = {}
                const acts = new Set(events.map((e: ShowEvent) => collapseStorageActKeyFromEvent(e)))
                acts.forEach(a => newRuntimeCollapsed[a] = true)
                const scenes = new Set(
                    events.filter((e: ShowEvent) => e.sceneId !== undefined).map((e: ShowEvent) =>
                        collapseStorageSceneKeyFromEvent(e)
                    )
                )
                scenes.forEach((s: string) => newRuntimeCollapsed[s] = true)
                newRuntimeCollapsed[actKey] = false
                newRuntimeCollapsed[sceneKey] = false
                set({ runtimeCollapsedGroups: newRuntimeCollapsed })
            }
        } else {
            if (activeShow?.viewState?.collapsedGroups) {
                set({ runtimeCollapsedGroups: { ...activeShow.viewState.collapsedGroups } })
            }
        }
    },

    nextEvent: (force = false) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'nextEvent', force })
            return
        }
        const { activeEventIndex, events, blinkingNextEvent, navigationWarning, setActiveEvent, broadcastState } = get()
        if (activeEventIndex >= events.length - 1) return
        if (!blinkingNextEvent && !force && navigationWarning !== 'event') {
            set({ navigationWarning: 'event' })
            broadcastState()
            return
        }
        const current = events[activeEventIndex]

        // Find next event Title
        const next = events.find((e: ShowEvent, i: number) =>
            i > activeEventIndex &&
            e.type?.toLowerCase() === 'title' &&
            (e.act !== current.act || e.sceneId !== current.sceneId || e.eventId !== current.eventId)
        )

        if (next) {
            setActiveEvent(events.indexOf(next))
        } else {
            setActiveEvent(activeEventIndex + 1)
        }
    },

    nextScene: (force = false) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'nextScene', force })
            return
        }
        const { activeEventIndex, events, blinkingNextScene, navigationWarning, setActiveEvent, broadcastState } = get()
        const current = events[activeEventIndex]
        if (!current) return
        if (!blinkingNextScene && !force && navigationWarning !== 'scene') {
            set({ navigationWarning: 'scene' })
            broadcastState()
            return
        }
        const currentAct = current.act
        const currentSceneId = current.sceneId ?? 0

        // Find the next (act, sceneId) boundary after the current position.
        const nextSceneKey = (() => {
            for (let i = activeEventIndex + 1; i < events.length; i++) {
                const e = events[i]
                if (!e) continue
                const eSceneId = e.sceneId ?? 0
                if (e.act !== currentAct || eSceneId !== currentSceneId) {
                    return { act: e.act, sceneId: eSceneId }
                }
            }
            return null
        })()
        if (!nextSceneKey) return

        const sceneIdFor = (e: ShowEvent) => (e.sceneId ?? 0)
        const eventIdFor = (e: ShowEvent) => (e.eventId ?? 0)

        // Within that target scene, jump to the first event group (prefer Title row).
        const candidates = events.filter(e =>
            e &&
            e.act === nextSceneKey.act &&
            sceneIdFor(e) === nextSceneKey.sceneId
        )
        if (candidates.length === 0) return

        const minPositiveEvent = Math.min(...candidates.map(e => eventIdFor(e)).filter(n => n > 0))
        const targetEventId = Number.isFinite(minPositiveEvent) ? minPositiveEvent : Math.min(...candidates.map(e => eventIdFor(e)))

        const titleIdx = events.findIndex(e =>
            e.act === nextSceneKey.act &&
            sceneIdFor(e) === nextSceneKey.sceneId &&
            eventIdFor(e) === targetEventId &&
            (e.type || '').toLowerCase() === 'title'
        )
        if (titleIdx !== -1) {
            setActiveEvent(titleIdx)
            return
        }
        const firstGroupIdx = events.findIndex(e =>
            e.act === nextSceneKey.act &&
            sceneIdFor(e) === nextSceneKey.sceneId &&
            eventIdFor(e) === targetEventId
        )
        if (firstGroupIdx !== -1) setActiveEvent(firstGroupIdx)
    },

    nextAct: (force = false) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'nextAct', force })
            return
        }
        const { activeEventIndex, events, blinkingNextAct, navigationWarning, setActiveEvent, broadcastState } = get()
        const current = events[activeEventIndex]
        if (!current) return
        if (!blinkingNextAct && !force && navigationWarning !== 'act') {
            set({ navigationWarning: 'act' })
            broadcastState()
            return
        }
        // Jump to the first Scene + first Event of the next Act (not merely the first row after boundary).
        const nextActName = (() => {
            for (let i = activeEventIndex + 1; i < events.length; i++) {
                const e = events[i]
                if (e && e.act && e.act !== current.act) return e.act
            }
            return null
        })()
        if (!nextActName) return

        const sceneIdFor = (e: ShowEvent) => (e.sceneId ?? 0)
        const eventIdFor = (e: ShowEvent) => (e.eventId ?? 0)

        const candidates = events.filter(e => e && e.act === nextActName)
        if (candidates.length === 0) return

        const minPositiveScene = Math.min(...candidates.map(e => sceneIdFor(e)).filter(n => n > 0))
        const targetSceneId = Number.isFinite(minPositiveScene) ? minPositiveScene : Math.min(...candidates.map(e => sceneIdFor(e)))

        const inTargetScene = candidates.filter(e => sceneIdFor(e) === targetSceneId)
        const minPositiveEvent = Math.min(...inTargetScene.map(e => eventIdFor(e)).filter(n => n > 0))
        const targetEventId = Number.isFinite(minPositiveEvent) ? minPositiveEvent : Math.min(...inTargetScene.map(e => eventIdFor(e)))

        // Prefer the Title row of that first group (if present), else first row in the group.
        const titleIdx = events.findIndex(e =>
            e.act === nextActName &&
            (e.sceneId ?? 0) === targetSceneId &&
            (e.eventId ?? 0) === targetEventId &&
            (e.type || '').toLowerCase() === 'title'
        )
        if (titleIdx !== -1) {
            setActiveEvent(titleIdx)
            return
        }
        const firstGroupIdx = events.findIndex(e =>
            e.act === nextActName &&
            (e.sceneId ?? 0) === targetSceneId &&
            (e.eventId ?? 0) === targetEventId
        )
        if (firstGroupIdx !== -1) setActiveEvent(firstGroupIdx)
    },

    updateBlinkRecommendations: (activeIndex: number) => {
        const { events } = get()
        const current = events[activeIndex]
        if (!current) return
        let nextEventIdx = -1, nextSceneIdx = -1, nextActIdx = -1
        for (let i = activeIndex + 1; i < events.length; i++) {
            const e = events[i]
            if (e.act === current.act && e.sceneId === current.sceneId && e.eventId === current.eventId) continue
            if (e.act === current.act) {
                if (e.sceneId === current.sceneId && e.eventId !== undefined && current.eventId !== undefined && e.eventId > current.eventId && nextEventIdx === -1) nextEventIdx = i
                if (e.sceneId !== undefined && current.sceneId !== undefined && e.sceneId > current.sceneId && nextSceneIdx === -1) nextSceneIdx = i
            } else if (nextActIdx === -1) nextActIdx = i
        }
        set({
            blinkingNextEvent: nextEventIdx !== -1,
            blinkingNextScene: nextEventIdx === -1 && nextSceneIdx !== -1,
            blinkingNextAct: nextEventIdx === -1 && nextSceneIdx === -1 && nextActIdx !== -1
        })
    },

    toggleCollapse: (id: string) => {
        const { isLocked, runtimeCollapsedGroups, activeShow, updateActiveShow } = get()
        const current = !!runtimeCollapsedGroups[id]
        const next = !current
        const newCollapsed = { ...runtimeCollapsedGroups, [id]: next }
        set({ runtimeCollapsedGroups: newCollapsed, freezeRuntimeCollapsedGroups: isLocked })
        if (!isLocked && activeShow) {
            updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: newCollapsed } })
        }
    },

    collapseAll: () => {
        const { events, activeShow, isLocked, updateActiveShow, activeEventIndex } = get()

        // EDIT MODE: keep act/scene structure visible, collapse event details (light/media).
        if (!isLocked) {
            const newCollapsed: Record<string, boolean> = {}
            events.forEach(e => {
                newCollapsed[collapseStorageActKeyFromEvent(e)] = false
                if (e.sceneId !== undefined) {
                    newCollapsed[collapseStorageSceneKeyFromEvent(e)] = false
                }
                newCollapsed[collapseStorageEventKeyFromEvent(e)] = true
            })
            set({ runtimeCollapsedGroups: newCollapsed, freezeRuntimeCollapsedGroups: false })
            if (activeShow) {
                updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: newCollapsed } })
            }
            return
        }

        // SHOW MODE: collapse the tree down to the active + next act/scene,
        // but keep the active/next position clear. Also hide light/media blocks.
        const newCollapsed: Record<string, boolean> = {}

        const current = activeEventIndex >= 0 ? events[activeEventIndex] : events[0]
        const normalizedCurrentSceneId = current?.sceneId ?? 0

        // Default: collapse all acts and scenes.
        new Set(events.map(e => collapseStorageActKeyFromEvent(e))).forEach((k: string) => {
            newCollapsed[k] = true
        })
        events.forEach(e => {
            if (e.sceneId === undefined) return
            newCollapsed[collapseStorageSceneKeyFromEvent(e)] = true
        })

        // Expand active act/scene.
        if (current) {
            newCollapsed[collapseStorageActKeyFromEvent(current)] = false
            newCollapsed[collapseStorageSceneKeyFromEvent(current)] = false
        }

        // Expand next act/scene (first differing group).
        if (current) {
            let nextE: ShowEvent | null = null
            for (let i = activeEventIndex + 1; i < events.length; i++) {
                const e = events[i]
                if (e.act !== current.act || e.sceneId !== current.sceneId || e.eventId !== current.eventId) {
                    nextE = e
                    break
                }
            }
            if (nextE) {
                newCollapsed[collapseStorageActKeyFromEvent(nextE)] = false
                newCollapsed[collapseStorageSceneKeyFromEvent(nextE)] = false
            }
        }

        // Collapse event nodes (hide light/media).
        events.forEach(e => {
            newCollapsed[collapseStorageEventKeyFromEvent(e)] = true
        })

        set({ runtimeCollapsedGroups: newCollapsed, freezeRuntimeCollapsedGroups: true })
    },

    expandAll: () => {
        const { activeShow, isLocked, updateActiveShow } = get()
        if (!isLocked) {
            set({ runtimeCollapsedGroups: {}, freezeRuntimeCollapsedGroups: false })
            if (activeShow) {
                updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: {} } })
            }
            return
        }

        // In Show-mode is the default fallback in the UI "collapsed" when keys are missing.
        // So we must explicitly set all act/scene/event nodes to expanded.
        const { events } = get()
        const newCollapsed: Record<string, boolean> = {}
        events.forEach(e => {
            newCollapsed[collapseStorageActKeyFromEvent(e)] = false
            if (e.sceneId !== undefined) {
                newCollapsed[collapseStorageSceneKeyFromEvent(e)] = false
            }
            newCollapsed[collapseStorageEventKeyFromEvent(e)] = false
        })
        set({ runtimeCollapsedGroups: newCollapsed, freezeRuntimeCollapsedGroups: true })
    },

    toggleTimeTracking: () => set((state) => ({ isTimeTracking: !state.isTimeTracking })),

    togglePause: () => {
        const { isPaused, pauseStartTime, lastTransitionTime, broadcastState } = get()
        const isHost = !!(window as any).require
        if (!isHost) return
        if (isPaused) {
            const pausedDuration = Date.now() - (pauseStartTime || Date.now())
            set({
                isPaused: false,
                pauseStartTime: null,
                lastTransitionTime: lastTransitionTime ? lastTransitionTime + pausedDuration : null
            })
        } else {
            set({ isPaused: true, pauseStartTime: Date.now() })
        }
        broadcastState()
    },

    toggleAutoFollowScript: () => set((state) => ({ autoFollowScript: !state.autoFollowScript })),

    addEventAbove: (index, type = 'Scene', cue = '') => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const tl = (type || '').toLowerCase()
        let newEvent: ShowEvent = {
            ...events[index],
            uid: undefined,
            type,
            cue,
            fixture: '',
            effect: '',
            filename: '',
            duration: undefined,
            timingSamples: undefined,
        }
        if (tl === 'action') {
            newEvent = { ...newEvent, actionCompleted: false, actionCueMoment: undefined, actionAssignee: undefined, scriptMarkerNorm: undefined }
        } else {
            newEvent = { ...newEvent, actionCueMoment: undefined, actionAssignee: undefined, scriptMarkerNorm: undefined, actionCompleted: undefined }
        }
        const newEvents = [...events]
        newEvents.splice(index, 0, newEvent)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addEventBelow: (index, type = 'Scene', cue = '') => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const tl = (type || '').toLowerCase()
        let newEvent: ShowEvent = {
            ...events[index],
            uid: undefined,
            type,
            cue,
            fixture: '',
            effect: '',
            filename: '',
            duration: undefined,
            timingSamples: undefined,
        }
        if (tl === 'action') {
            newEvent = { ...newEvent, actionCompleted: false, actionCueMoment: undefined, actionAssignee: undefined, scriptMarkerNorm: undefined }
        } else {
            newEvent = { ...newEvent, actionCueMoment: undefined, actionAssignee: undefined, scriptMarkerNorm: undefined, actionCompleted: undefined }
        }
        const newEvents = [...events]
        newEvents.splice(index + 1, 0, newEvent)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    insertAct: (index, position) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const newRows: ShowEvent[] = [
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Act', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Scene', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent
        ]

        if (!events.length) {
            setEvents([...newRows])
            reindexEvents()
            saveCurrentShow()
            return
        }

        const target = events[index]
        let insertAt = index
        const sameActBlock = (e: ShowEvent) =>
            target.actUid ? e.actUid === target.actUid : e.act === target.act
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (sameActBlock(events[i])) insertAt = i + 1
                else break
            }
        } else {
            for (let i = index; i >= 0; i--) {
                if (sameActBlock(events[i])) insertAt = i
                else break
            }
        }
        const newEvents = [...events]
        newEvents.splice(insertAt, 0, ...newRows)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    insertScene: (index, position) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const target = events[index]

        let insertAt = index

        // Zoek volledige scene block
        const sameSceneBlock = (e: ShowEvent) =>
            (target.actUid ? e.actUid === target.actUid : e.act === target.act) &&
            e.sceneId === target.sceneId
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (sameSceneBlock(events[i])) insertAt = i + 1
                else break
            }
        } else {
            for (let i = index; i >= 0; i--) {
                if (sameSceneBlock(events[i])) insertAt = i
                else break
            }
        }

        // 👉 NIEUW sceneId (tijdelijk — reindexEvents corrigeert)
        const newSceneId = (target.sceneId || 0) + 1

        const newRows: ShowEvent[] = [
            { act: target.act, actUid: target.actUid, sceneId: newSceneId, type: 'Scene', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true },
            { act: target.act, actUid: target.actUid, sceneId: newSceneId, eventId: 1, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true },
            { act: target.act, actUid: target.actUid, sceneId: newSceneId, eventId: 1, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false },
            { act: target.act, actUid: target.actUid, sceneId: newSceneId, eventId: 1, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true }
        ]

        const newEvents = [...events]
        newEvents.splice(insertAt, 0, ...newRows)

        setEvents(newEvents)

        // 👉 laat structuur herstellen
        reindexEvents()

        saveCurrentShow()
    },

    insertEvent: (index, position) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const target = events[index]
        if (target.sceneId === undefined || target.eventId === undefined) return;

        const sameEventGrp = (e: ShowEvent) =>
            target.eventUid && e.eventUid
                ? e.eventUid === target.eventUid
                : e.act === target.act && e.sceneId === target.sceneId && e.eventId === target.eventId

        let insertAt = index
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (sameEventGrp(events[i])) insertAt = i + 1
                else break
            }
        } else {
            for (let i = index; i >= 0; i--) {
                if (sameEventGrp(events[i])) insertAt = i
                else break
            }
        }
        const newEvents = [...events]
        const newRows: ShowEvent[] = [
            { act: target.act, actUid: target.actUid, sceneUid: target.sceneUid, sceneId: target.sceneId, eventId: target.eventId, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: target.act, actUid: target.actUid, sceneUid: target.sceneUid, sceneId: target.sceneId, eventId: target.eventId, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent,
            { act: target.act, actUid: target.actUid, sceneUid: target.sceneUid, sceneId: target.sceneId, eventId: target.eventId, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent
        ]
        newEvents.splice(insertAt, 0, ...newRows)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    renameAct: async (actUid, newName) => {
        const trimmed = (newName || '').trim()
        const { events: ev0, setEvents, reindexEvents, activeShow, updateActiveShow, saveCurrentShow } = get()

        const anchor = ev0.find((e: ShowEvent) => e.actUid === actUid)
        if (!anchor) return false

        const oldDisplay = anchor.act
        const finalName = trimmed !== '' ? trimmed : oldDisplay
        if (finalName === oldDisplay) return true

        const newEvents = ev0.map((e: ShowEvent) => {
            if (e.actUid === actUid) {
                return { ...e, act: finalName }
            }
            if (e.stopAct === oldDisplay) {
                return { ...e, stopAct: finalName }
            }
            return e
        })

        setEvents(newEvents)
        reindexEvents()

        const sceneIds = new Set<number>()
        for (const e of get().events) {
            if (e.actUid === actUid && e.sceneId !== undefined) sceneIds.add(e.sceneId)
        }

        const show = activeShow || get().activeShow
        if (show) {
            const vs = show.viewState || {}
            const sceneNames = { ...(vs.sceneNames || {}) }
            const sceneScriptPages = { ...(vs.sceneScriptPages || {}) }
            for (const sid of sceneIds) {
                const o = `${oldDisplay}-${sid}`
                const n = `${finalName}-${sid}`
                if (o !== n && sceneNames[o] !== undefined) {
                    sceneNames[n] = sceneNames[o]!
                    delete sceneNames[o]
                }
                if (o !== n && sceneScriptPages[o] !== undefined) {
                    sceneScriptPages[n] = sceneScriptPages[o]!
                    delete sceneScriptPages[o]
                }
            }

            await updateActiveShow({
                viewState: {
                    ...vs,
                    sceneNames,
                    sceneScriptPages,
                },
            })
        } else {
            await saveCurrentShow()
        }

        return true
    },

    renameScene: (actName, sceneId, newDescription) => {
        const { activeShow, updateActiveShow, events } = get()
        if (!activeShow) return
        const sceneNames = { ...(activeShow.viewState?.sceneNames || {}) }
        const header = events.find(
            e =>
                e.act === actName &&
                (e.type || '').toLowerCase() === 'scene' &&
                (e.sceneId ?? 0) === (sceneId ?? 0)
        )
        const stableKey = header ? stableSceneMetaKey(header) : `${actName}-${sceneId}`
        const legacyKey = `${actName}-${sceneId}`
        sceneNames[stableKey] = newDescription
        if (legacyKey !== stableKey) {
            delete sceneNames[legacyKey]
        }
        updateActiveShow({ viewState: { ...activeShow.viewState, sceneNames } })
    },

    moveAct: (actScope, direction) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const actEvents = events.filter((e: ShowEvent) => eventMatchesActScope(e, actScope))
        const firstIndex = events.findIndex((e: ShowEvent) => eventMatchesActScope(e, actScope))
        const lastIndex = firstIndex + actEvents.length - 1
        let newEvents = [...events]
        if (direction === 'up' && firstIndex > 0) {
            const prev = events[firstIndex - 1]
            const prevScope = prev.actUid || prev.act
            const prevActEvents = events.filter((e: ShowEvent) => eventMatchesActScope(e, prevScope))
            newEvents.splice(firstIndex - prevActEvents.length, actEvents.length + prevActEvents.length, ...actEvents, ...prevActEvents)
        } else if (direction === 'down' && lastIndex < events.length - 1) {
            const next = events[lastIndex + 1]
            const nextScope = next.actUid || next.act
            const nextActEvents = events.filter((e: ShowEvent) => eventMatchesActScope(e, nextScope))
            newEvents.splice(firstIndex, actEvents.length + nextActEvents.length, ...nextActEvents, ...actEvents)
        }
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    moveScene: (actScope, sceneId, direction) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const sceneEvents = events.filter(
            (e: ShowEvent) => eventMatchesActScope(e, actScope) && e.sceneId === sceneId
        )
        const firstIndex = events.findIndex(
            (e: ShowEvent) => eventMatchesActScope(e, actScope) && e.sceneId === sceneId
        )
        const lastIndex = firstIndex + sceneEvents.length - 1
        let newEvents = [...events]
        if (direction === 'up' && firstIndex > 0 && eventMatchesActScope(events[firstIndex - 1], actScope)) {
            const prevSceneId = events[firstIndex - 1].sceneId
            if (prevSceneId !== undefined) {
                const prevSceneEvents = events.filter(
                    (e: ShowEvent) => eventMatchesActScope(e, actScope) && e.sceneId === prevSceneId
                )
                newEvents.splice(firstIndex - prevSceneEvents.length, sceneEvents.length + prevSceneEvents.length, ...sceneEvents, ...prevSceneEvents)
            }
        } else if (
            direction === 'down' &&
            lastIndex < events.length - 1 &&
            eventMatchesActScope(events[lastIndex + 1], actScope)
        ) {
            const nextSceneId = events[lastIndex + 1].sceneId
            if (nextSceneId !== undefined) {
                const nextSceneEvents = events.filter(
                    (e: ShowEvent) => eventMatchesActScope(e, actScope) && e.sceneId === nextSceneId
                )
                newEvents.splice(firstIndex, sceneEvents.length + nextSceneEvents.length, ...nextSceneEvents, ...sceneEvents)
            }
        }
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    moveEvent: (index, direction) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, activeEventIndex, selectedEventIndex } = get()
        if (index < 0 || index >= events.length) return

        const key = events[index]
        const act = key.act
        const sceneId = key.sceneId
        const eventId = key.eventId
        if (!act || sceneId === undefined || eventId === undefined) return

        const isSameEventGroup = (e: ShowEvent | undefined) =>
            !!e &&
            (key.eventUid && e.eventUid
                ? e.eventUid === key.eventUid
                : e.act === act && e.sceneId === sceneId && e.eventId === eventId)

        // Find contiguous block for the event group at index
        let start = index
        while (start > 0 && isSameEventGroup(events[start - 1])) start--
        let end = index
        while (end < events.length - 1 && isSameEventGroup(events[end + 1])) end++

        const currentBlock = events.slice(start, end + 1)

        if (direction === 'up') {
            const prevIdx = start - 1
            if (prevIdx < 0) return
            const prev = events[prevIdx]
            // Only allow moving within the same scene
            if (
                key.sceneUid && prev.sceneUid
                    ? prev.sceneUid !== key.sceneUid
                    : prev.act !== act || prev.sceneId !== sceneId
            )
                return

            const prevEventId = prev.eventId
            if (prevEventId === undefined) return
            const isSamePrevGroup = (e: ShowEvent | undefined) =>
                !!e &&
                (prev.eventUid && e.eventUid
                    ? e.eventUid === prev.eventUid
                    : e.act === act && e.sceneId === sceneId && e.eventId === prevEventId)

            let prevStart = prevIdx
            while (prevStart > 0 && isSamePrevGroup(events[prevStart - 1])) prevStart--
            const prevBlock = events.slice(prevStart, start)

            const newEvents = [
                ...events.slice(0, prevStart),
                ...currentBlock,
                ...prevBlock,
                ...events.slice(end + 1)
            ]

            const currentNewStart = prevStart
            const prevNewStart = prevStart + currentBlock.length

            const remap = (i: number) => {
                if (i >= start && i <= end) return currentNewStart + (i - start)
                if (i >= prevStart && i <= start - 1) return prevNewStart + (i - prevStart)
                return i
            }

            setEvents(newEvents)
            set({
                activeEventIndex: activeEventIndex >= 0 ? remap(activeEventIndex) : activeEventIndex,
                selectedEventIndex: selectedEventIndex >= 0 ? remap(selectedEventIndex) : selectedEventIndex,
            })
            reindexEvents()
            saveCurrentShow()
            return
        }

        if (direction === 'down') {
            const nextIdx = end + 1
            if (nextIdx >= events.length) return
            const next = events[nextIdx]
            // Only allow moving within the same scene
            if (
                key.sceneUid && next.sceneUid
                    ? next.sceneUid !== key.sceneUid
                    : next.act !== act || next.sceneId !== sceneId
            )
                return

            const nextEventId = next.eventId
            if (nextEventId === undefined) return
            const isSameNextGroup = (e: ShowEvent | undefined) =>
                !!e &&
                (next.eventUid && e.eventUid
                    ? e.eventUid === next.eventUid
                    : e.act === act && e.sceneId === sceneId && e.eventId === nextEventId)

            let nextEnd = nextIdx
            while (nextEnd < events.length - 1 && isSameNextGroup(events[nextEnd + 1])) nextEnd++
            const nextBlock = events.slice(nextIdx, nextEnd + 1)

            const newEvents = [
                ...events.slice(0, start),
                ...nextBlock,
                ...currentBlock,
                ...events.slice(nextEnd + 1)
            ]

            const nextNewStart = start
            const currentNewStart = start + nextBlock.length

            const remap = (i: number) => {
                if (i >= start && i <= end) return currentNewStart + (i - start)
                if (i >= nextIdx && i <= nextEnd) return nextNewStart + (i - nextIdx)
                return i
            }

            setEvents(newEvents)
            set({
                activeEventIndex: activeEventIndex >= 0 ? remap(activeEventIndex) : activeEventIndex,
                selectedEventIndex: selectedEventIndex >= 0 ? remap(selectedEventIndex) : selectedEventIndex,
            })
            reindexEvents()
            saveCurrentShow()
            return
        }
    },

    reorderActBefore: (draggedActUid, targetActUid) => {
        if (draggedActUid === targetActUid) return
        const { events, setEvents, reindexEvents, saveCurrentShow, activeEventIndex, selectedEventIndex } = get()
        const blocks = splitEventsIntoActBlocks(events)
        const keys = blocks.map(b => b[0]?.actUid).filter((u): u is string => !!u)
        const di = keys.indexOf(draggedActUid)
        const ti = keys.indexOf(targetActUid)
        if (di === -1 || ti === -1) return
        const order = [...keys]
        order.splice(di, 1)
        const newTi = order.indexOf(targetActUid)
        order.splice(newTi, 0, draggedActUid)
        const blockByUid = new Map<string, ShowEvent[]>()
        for (const b of blocks) {
            const u = b[0]?.actUid
            if (u) blockByUid.set(u, b)
        }
        const newEvents = order.flatMap(u => blockByUid.get(u) || [])
        const map = buildIndexRemap(events, newEvents)
        setEvents(newEvents)
        set({
            activeEventIndex: remapOptionalIndex(activeEventIndex, map),
            selectedEventIndex: remapOptionalIndex(selectedEventIndex, map),
        })
        reindexEvents()
        saveCurrentShow()
    },

    reorderSceneBefore: (actScope, draggedSceneId, targetSceneId) => {
        if (draggedSceneId === targetSceneId) return
        const { events, setEvents, reindexEvents, saveCurrentShow, activeEventIndex, selectedEventIndex } = get()
        let actStart = -1
        let actEnd = -1
        for (let i = 0; i < events.length; i++) {
            if (eventMatchesActScope(events[i], actScope)) {
                if (actStart === -1) actStart = i
                actEnd = i
            }
        }
        if (actStart === -1) return
        const actRows = events.slice(actStart, actEnd + 1)
        const segments = parseActRowsToSegments(actRows)
        const newSegs = reorderSceneSegmentsInPlace(segments, draggedSceneId, targetSceneId)
        if (newSegs === segments) return
        const newRows = newSegs.flatMap(s => s.rows)
        const newEvents = [...events.slice(0, actStart), ...newRows, ...events.slice(actEnd + 1)]
        const map = buildIndexRemap(events, newEvents)
        setEvents(newEvents)
        set({
            activeEventIndex: remapOptionalIndex(activeEventIndex, map),
            selectedEventIndex: remapOptionalIndex(selectedEventIndex, map),
        })
        reindexEvents()
        saveCurrentShow()
    },

    moveSceneToAct: async (fromActScope, fromSceneId, toActScope) => {
        if (fromActScope === toActScope) return
        const {
            events,
            setEvents,
            reindexEvents,
            updateActiveShow,
            saveCurrentShow,
            activeEventIndex,
            selectedEventIndex,
            addToast,
        } = get()

        let firstIdx = -1
        let lastIdx = -1
        for (let i = 0; i < events.length; i++) {
            if (eventMatchesActScope(events[i], fromActScope) && events[i].sceneId === fromSceneId) {
                if (firstIdx === -1) firstIdx = i
                lastIdx = i
            }
        }
        if (firstIdx === -1) return

        const fromAnchor = events[firstIdx]
        const fromLabel = fromAnchor.act

        const sceneIdsInSource = new Set<number>()
        for (const e of events) {
            if (eventMatchesActScope(e, fromActScope) && e.sceneId !== undefined) sceneIdsInSource.add(e.sceneId)
        }
        if (sceneIdsInSource.size <= 1) {
            addToast('Deze act heeft maar één scene; verplaatsen kan niet.', 'warning')
            return
        }

        if (events.findIndex(e => eventMatchesActScope(e, toActScope)) === -1) {
            addToast('Doel-act niet gevonden.', 'warning')
            return
        }

        const toAnchor =
            events.find(
                e =>
                    eventMatchesActScope(e, toActScope) && (e.type || '').toLowerCase() === 'act'
            ) || events.find(e => eventMatchesActScope(e, toActScope))
        const toLabel = toAnchor?.act ?? ''
        const toActUid = toAnchor?.actUid
        if (!toActUid) {
            addToast('Doel-act mist stabiele id; sla de show op en probeer opnieuw.', 'warning')
            return
        }

        const sceneRows = events.slice(firstIdx, lastIdx + 1)
        const fromHeader = sceneRows.find(
            e => (e.type || '').toLowerCase() === 'scene' && e.sceneId === fromSceneId
        )
        const oldViewKey = fromHeader ? stableSceneMetaKey(fromHeader) : `${fromLabel}-${fromSceneId}`
        const fromCollapse =
            fromHeader?.actUid && fromHeader.sceneUid
                ? `scene-${fromHeader.actUid}::${fromHeader.sceneUid}`
                : `scene-${fromLabel}-${fromSceneId}`

        const without = [...events.slice(0, firstIdx), ...events.slice(lastIdx + 1)]

        let targStart = without.findIndex(e => eventMatchesActScope(e, toActScope))
        if (targStart === -1) return
        let targEnd = targStart
        for (let i = targStart; i < without.length; i++) {
            if (eventMatchesActScope(without[i], toActScope)) targEnd = i
            else break
        }

        const moved = sceneRows.map(e => ({ ...e, act: toLabel, actUid: toActUid }))
        const newEvents = [...without.slice(0, targEnd + 1), ...moved, ...without.slice(targEnd + 1)]

        const map = buildIndexRemap(events, newEvents)
        setEvents(newEvents)
        set({
            activeEventIndex: remapOptionalIndex(activeEventIndex, map),
            selectedEventIndex: remapOptionalIndex(selectedEventIndex, map),
        })
        reindexEvents()

        const evsAfter = get().events
        let newSceneId: number | null = null
        let ts = -1
        let te = -1
        for (let i = 0; i < evsAfter.length; i++) {
            if (eventMatchesActScope(evsAfter[i], toActScope)) {
                if (ts === -1) ts = i
                te = i
            } else if (ts !== -1) break
        }
        if (ts !== -1) {
            for (let i = te; i >= ts; i--) {
                if ((evsAfter[i].type || '').toLowerCase() === 'scene') {
                    const next = evsAfter[i + 1]
                    if (next?.sceneId !== undefined) {
                        newSceneId = next.sceneId
                        break
                    }
                }
            }
        }

        if (newSceneId === null) {
            addToast('Kon de scene na verplaatsen niet vaststellen. Controleer de sequence.', 'error')
            await saveCurrentShow()
            return
        }

        const newHeader = evsAfter.find(
            e =>
                eventMatchesActScope(e, toActScope) &&
                (e.type || '').toLowerCase() === 'scene' &&
                e.sceneId === newSceneId
        )
        const newViewKey = newHeader ? stableSceneMetaKey(newHeader) : `${toLabel}-${newSceneId}`
        const toCollapse =
            newHeader?.actUid && newHeader.sceneUid
                ? `scene-${newHeader.actUid}::${newHeader.sceneUid}`
                : `scene-${toLabel}-${newSceneId}`

        const show = get().activeShow
        if (!show) {
            await saveCurrentShow()
            addToast(`Scene verplaatst naar “${toLabel}”.`, 'info')
            return
        }

        const vs = show.viewState || {}
        const sceneNames = { ...(vs.sceneNames || {}) }
        const sceneScriptPages = { ...(vs.sceneScriptPages || {}) }
        const collapsedGroups = { ...(vs.collapsedGroups || {}) }
        if (Object.prototype.hasOwnProperty.call(sceneNames, oldViewKey)) {
            sceneNames[newViewKey] = sceneNames[oldViewKey] as string
            delete sceneNames[oldViewKey]
        }
        if (Object.prototype.hasOwnProperty.call(sceneScriptPages, oldViewKey)) {
            sceneScriptPages[newViewKey] = sceneScriptPages[oldViewKey] as number
            delete sceneScriptPages[oldViewKey]
        }
        if (Object.prototype.hasOwnProperty.call(collapsedGroups, fromCollapse)) {
            collapsedGroups[toCollapse] = collapsedGroups[fromCollapse]!
            delete collapsedGroups[fromCollapse]
        }

        await updateActiveShow({
            viewState: {
                ...vs,
                sceneNames,
                sceneScriptPages,
                collapsedGroups,
            },
        })

        addToast(`Scene verplaatst naar “${toLabel}”.`, 'info')
    },

    moveEventGroupBefore: (fromGroupStartIndex, beforeTargetIndex) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, activeEventIndex, selectedEventIndex } = get()
        if (
            fromGroupStartIndex < 0 ||
            beforeTargetIndex < 0 ||
            fromGroupStartIndex >= events.length ||
            beforeTargetIndex >= events.length
        )
            return

        const isSameEventGroup = (a: ShowEvent | undefined, b: ShowEvent | undefined) =>
            !!a &&
            !!b &&
            a.act === b.act &&
            a.sceneId === b.sceneId &&
            a.eventId === b.eventId

        const key = events[fromGroupStartIndex]
        const act = key.act
        const sceneId = key.sceneId
        const eventId = key.eventId
        if (!act || sceneId === undefined || eventId === undefined) return

        let fs = fromGroupStartIndex
        let fe = fromGroupStartIndex
        while (fs > 0 && isSameEventGroup(events[fs - 1], key)) fs--
        while (fe < events.length - 1 && isSameEventGroup(events[fe + 1], key)) fe++

        let bs = beforeTargetIndex
        while (bs > 0 && isSameEventGroup(events[bs - 1], events[beforeTargetIndex])) bs--

        if (bs >= fs && bs <= fe) return

        const tgt = events[bs]
        if (!tgt || tgt.act !== act || tgt.sceneId !== sceneId) return

        const block = events.slice(fs, fe + 1)
        const without = [...events.slice(0, fs), ...events.slice(fe + 1)]
        let insertAt = bs
        if (fe < bs) insertAt = bs - block.length
        const newEvents = [...without.slice(0, insertAt), ...block, ...without.slice(insertAt)]
        const map = buildIndexRemap(events, newEvents)
        setEvents(newEvents)
        set({
            activeEventIndex: remapOptionalIndex(activeEventIndex, map),
            selectedEventIndex: remapOptionalIndex(selectedEventIndex, map),
        })
        reindexEvents()
        saveCurrentShow()
    },

    moveEventGroupAfter: (fromGroupStartIndex, afterTargetGroupStartIndex) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, activeEventIndex, selectedEventIndex } = get()
        if (
            fromGroupStartIndex < 0 ||
            afterTargetGroupStartIndex < 0 ||
            fromGroupStartIndex >= events.length ||
            afterTargetGroupStartIndex >= events.length
        )
            return

        const isSameEventGroup = (a: ShowEvent | undefined, b: ShowEvent | undefined) =>
            !!a &&
            !!b &&
            a.act === b.act &&
            a.sceneId === b.sceneId &&
            a.eventId === b.eventId

        const key = events[fromGroupStartIndex]
        const act = key.act
        const sceneId = key.sceneId
        const eventId = key.eventId
        if (!act || sceneId === undefined || eventId === undefined) return

        let fs = fromGroupStartIndex
        let fe = fromGroupStartIndex
        while (fs > 0 && isSameEventGroup(events[fs - 1], key)) fs--
        while (fe < events.length - 1 && isSameEventGroup(events[fe + 1], key)) fe++

        const tKey = events[afterTargetGroupStartIndex]
        if (!tKey || tKey.act !== act || tKey.sceneId !== sceneId) return

        let ta = afterTargetGroupStartIndex
        let te = afterTargetGroupStartIndex
        while (ta > 0 && isSameEventGroup(events[ta - 1], tKey)) ta--
        while (te < events.length - 1 && isSameEventGroup(events[te + 1], tKey)) te++

        if (fs <= te && fe >= ta) return

        const block = events.slice(fs, fe + 1)
        let insertAt = te + 1
        const without = [...events.slice(0, fs), ...events.slice(fe + 1)]
        if (fe < insertAt) insertAt -= block.length

        const newEvents = [...without.slice(0, insertAt), ...block, ...without.slice(insertAt)]
        const map = buildIndexRemap(events, newEvents)
        setEvents(newEvents)
        set({
            activeEventIndex: remapOptionalIndex(activeEventIndex, map),
            selectedEventIndex: remapOptionalIndex(selectedEventIndex, map),
        })
        reindexEvents()
        saveCurrentShow()
    },

    moveActionRowWithinGroup: (fromIndex, toIndex, edge) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, activeEventIndex, selectedEventIndex } = get()
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= events.length || toIndex >= events.length) return
        if (fromIndex === toIndex) return

        const row = events[fromIndex]
        const tgt = events[toIndex]
        if (!row || !tgt) return
        if (row.type?.toLowerCase() !== 'action' || tgt.type?.toLowerCase() !== 'action') return
        if (row.act !== tgt.act || row.sceneId !== tgt.sceneId || row.eventId !== tgt.eventId) return

        const isSameEventGroup = (a: ShowEvent | undefined, b: ShowEvent | undefined) =>
            !!a && !!b && a.act === b.act && a.sceneId === b.sceneId && a.eventId === b.eventId

        let start = fromIndex
        while (start > 0 && isSameEventGroup(events[start - 1], row)) start--
        let end = fromIndex
        while (end < events.length - 1 && isSameEventGroup(events[end + 1], row)) end++
        if (toIndex < start || toIndex > end) return

        const rawInsert = edge === 'after' ? toIndex + 1 : toIndex
        let insertAt = rawInsert
        if (fromIndex < rawInsert) insertAt = rawInsert - 1

        const newEvents = [...events]
        const [moved] = newEvents.splice(fromIndex, 1)
        newEvents.splice(insertAt, 0, moved)

        const map = buildIndexRemap(events, newEvents)
        setEvents(newEvents)
        set({
            activeEventIndex: remapOptionalIndex(activeEventIndex, map),
            selectedEventIndex: remapOptionalIndex(selectedEventIndex, map),
        })
        reindexEvents()
        saveCurrentShow()
    },

    deleteEvent: (index) => {
        const { events, setEvents, reindexEvents, activeEventIndex, setActiveEvent, saveCurrentShow } = get()
        const newEvents = [...events]
        newEvents.splice(index, 1)
        setEvents(newEvents)
        if (activeEventIndex === index) setActiveEvent(-1)
        else if (activeEventIndex > index) set({ activeEventIndex: activeEventIndex - 1 })
        reindexEvents()
        saveCurrentShow()
    },

    deleteGroup: (act: string, sceneId: number, eventId: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const count = events.filter((e: ShowEvent) => e.act === act && e.sceneId === sceneId && e.eventId === eventId).length
        if (events.length <= count) return
        const newEvents = events.filter((e: ShowEvent) => !(e.act === act && e.sceneId === sceneId && e.eventId === eventId))
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    deleteAct: (actScope: string) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const blocks = splitEventsIntoActBlocks(events)
        if (blocks.length <= 1) return
        const newEvents = events.filter((e: ShowEvent) => !eventMatchesActScope(e, actScope))
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    deleteScene: (actScope: string, sceneId: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const scenesInAct = new Set(
            events
                .filter((e: ShowEvent) => eventMatchesActScope(e, actScope) && e.sceneId !== undefined)
                .map((e: ShowEvent) => e.sceneId)
        )
        if (scenesInAct.size <= 1) return
        const newEvents = events.filter(
            (e: ShowEvent) => !(eventMatchesActScope(e, actScope) && e.sceneId === sceneId)
        )
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addCommentToEvent: (index: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const target = events[index]
        const newComment = { act: target.act, sceneId: target.sceneId, eventId: target.eventId, actionId: target.actionId, type: 'Comment', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false, cue: 'Nieuw commentaar' } as ShowEvent
        const newEvents = [...events]
        newEvents.splice(index + 1, 0, newComment)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addActComment: (actUid: string) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, addToast } = get()
        const hasComment = events.some(
            e =>
                e.actUid === actUid &&
                (!e.sceneId || e.sceneId === 0) &&
                e.type?.toLowerCase() === 'comment'
        )
        if (hasComment) {
            addToast('Er is al een commentaar-regel voor deze Act.', 'warning')
            return
        }

        const firstRowIndex = events.findIndex(e => e.actUid === actUid)
        if (firstRowIndex === -1) return
        const label = events[firstRowIndex]?.act ?? ''

        const newComment = {
            act: label,
            actUid,
            type: 'Comment',
            cue: 'Nieuw act commentaar',
            fixture: '',
            effect: '',
            palette: '',
            color1: '#ffffff',
            color2: '#ffffff',
            color3: '#ffffff',
            brightness: 0,
            speed: 0,
            intensity: 0,
            transition: 0,
            sound: false,
        } as ShowEvent

        const newEvents = [...events]
        newEvents.splice(firstRowIndex + 1, 0, newComment)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addSceneComment: (actUid: string, sceneId: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, addToast } = get()
        const hasComment = events.some(
            e =>
                e.actUid === actUid &&
                e.sceneId === sceneId &&
                (!e.eventId || e.eventId === 0) &&
                e.type?.toLowerCase() === 'comment'
        )
        if (hasComment) {
            addToast('Er is al een commentaar-regel voor deze Scene.', 'warning')
            return
        }

        const firstRowIndex = events.findIndex(e => e.actUid === actUid && e.sceneId === sceneId)
        if (firstRowIndex === -1) return
        const label = events[firstRowIndex]?.act ?? ''

        const newComment = {
            act: label,
            actUid,
            sceneId,
            type: 'Comment',
            cue: 'Nieuw scene commentaar',
            fixture: '',
            effect: '',
            palette: '',
            color1: '#ffffff',
            color2: '#ffffff',
            color3: '#ffffff',
            brightness: 0,
            speed: 0,
            intensity: 0,
            transition: 0,
            sound: false,
        } as ShowEvent

        const newEvents = [...events]
        newEvents.splice(firstRowIndex + 1, 0, newComment)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    maybeAdvanceOnAllActionsComplete: (updatedRowIndex?: number) => {
        const { events, activeEventIndex, isLocked, nextEvent } = get()
        if (!isLocked || activeEventIndex < 0) return
        const cur = events[activeEventIndex]
        if (!cur) return
        const act = cur.act
        const sid = cur.sceneId ?? 0
        const eid = cur.eventId ?? 0

        if (updatedRowIndex !== undefined) {
            const upd = events[updatedRowIndex]
            if (!upd || (upd.type || '').toLowerCase() !== 'action') return
            if (upd.act !== act || (upd.sceneId ?? 0) !== sid || (upd.eventId ?? 0) !== eid) return
        }

        const hasTrigger = events.some(
            e =>
                e.act === act &&
                (e.sceneId ?? 0) === sid &&
                (e.eventId ?? 0) === eid &&
                (e.type || '').toLowerCase() === 'trigger' &&
                (e.effect || '').toLowerCase() === 'actions_complete'
        )
        if (!hasTrigger) return
        const actions = events.filter(
            e =>
                e.act === act &&
                (e.sceneId ?? 0) === sid &&
                (e.eventId ?? 0) === eid &&
                (e.type || '').toLowerCase() === 'action'
        )
        if (actions.length === 0) {
            nextEvent(true)
            return
        }
        if (actions.every(a => !!a.actionCompleted)) {
            nextEvent(true)
        }
    },

    updateEvent: (index: number, partial: Partial<ShowEvent>) => {
        const isHost = typeof window !== 'undefined' && !!(window as any).require
        const { events, setEvents, saveCurrentShow, isLocked, broadcastState, maybeAdvanceOnAllActionsComplete } = get()
        const newEvents = [...events]
        newEvents[index] = { ...newEvents[index], ...partial }
        setEvents(newEvents)
        saveCurrentShow()
        if (isHost && isLocked && Object.prototype.hasOwnProperty.call(partial, 'actionCompleted')) {
            maybeAdvanceOnAllActionsComplete(index)
            broadcastState()
        }
    },

    resendEvent: (index: number) => {
        const { events, eventStatuses } = get()
        const event = events[index]
        if (!event) return
        set({ eventStatuses: { ...eventStatuses, [index]: 'sending' } })
        try {
            networkService.sendCommand({ type: 'EVENT_TRIGGER', event })
        } catch {
            /* ignore */
        }
        setTimeout(() => set((s) => ({ eventStatuses: { ...s.eventStatuses, [index]: 'ok' } })), 500)
    },

    reindexEvents: () => {
        const { events, setEvents } = get()
        let currentAct = ''
        let currentSceneId = 0
        let currentEventId = 0
        let currentActionId = 0
        let actCounter = 0

        const newEvents = events.map((e: ShowEvent, rowIndex: number) => {
            const type = e.type?.toLowerCase() || ''

            if (type === 'act') {
                actCounter++
                const trimmed = (e.act && String(e.act).trim()) || ''
                currentAct = trimmed || `Act ${actCounter}`
                currentSceneId = 0
                currentEventId = 0
                currentActionId = 0
            } else if (type === 'scene') {
                currentSceneId++
                currentEventId = 0
                currentActionId = 0
            } else if (type === 'title') {
                currentEventId++
                currentActionId = 0
            } else if (type === 'action' || type === 'media' || type === 'light') {
                currentActionId++
            }

            const finalAct = currentAct || e.act

            const updatedEvent: ShowEvent = {
                ...e,
                act: finalAct,
                sortOrder: rowIndex,
            }

            // Alleen toewijzen wat van toepassing is voor de specifieke laag van de hiërarchie
            if (type === 'act' || (type === 'comment' && currentSceneId === 0)) {
                updatedEvent.sceneId = undefined
                updatedEvent.eventId = undefined
                updatedEvent.actionId = undefined
            } else if (type === 'scene' || (type === 'comment' && currentEventId === 0)) {
                updatedEvent.sceneId = currentSceneId
                updatedEvent.eventId = undefined
                updatedEvent.actionId = undefined
            } else if (type === 'title' || type === 'trigger' || (type === 'comment' && currentActionId === 0)) {
                updatedEvent.sceneId = currentSceneId
                updatedEvent.eventId = currentEventId
                updatedEvent.actionId = undefined
            } else {
                // Alles wat hieronder valt zijn actions: light/media/action
                updatedEvent.sceneId = currentSceneId
                updatedEvent.eventId = currentEventId
                updatedEvent.actionId = currentActionId
            }

            return updatedEvent
        })
        setEvents(newEvents)
    },

    copyToClipboard: async (event: ShowEvent) => {
        const { addToast, loadClipboard } = get()
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:save-clipboard', { type: 'event', data: event })
            loadClipboard()
            addToast('Event gekopieerd naar klembord')
        }
    },

    loadClipboard: async () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            const items = await ipcRenderer.invoke('db:get-clipboard')
            set({ clipboard: items })
        }
    },

    removeFromClipboard: async (id: number) => {
        const { loadClipboard } = get()
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:delete-clipboard', id)
            loadClipboard()
        }
    },

    clearClipboard: async () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:clear-clipboard')
            set({ clipboard: [] })
        }
    },

    pasteEvent: (index: number, partialData: Partial<ShowEvent>) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const newEvents = [...events]
        newEvents.splice(index + 1, 0, { ...events[index], ...partialData })
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },
});
