import type { StateCreator } from 'zustand';
import { type ShowState } from '../types';
import type { ShowEvent, ClipboardItem } from '../../types/show';
import { networkService } from '../../services/network-service';

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

    setEvents: (events: ShowEvent[]) => void;
    setShowStartTime: (time: string) => void;
    setActiveEvent: (index: number) => void;
    startShow: () => void;
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
    renameAct: (oldName: string, newName: string) => void;
    renameScene: (actName: string, sceneId: number, newDescription: string) => void;
    moveAct: (actName: string, direction: 'up' | 'down') => void;
    moveScene: (actName: string, sceneId: number, direction: 'up' | 'down') => void;
    moveEvent: (index: number, direction: 'up' | 'down') => void;
    deleteEvent: (index: number) => void;
    deleteGroup: (act: string, sceneId: number, eventId: number) => void;
    deleteAct: (act: string) => void;
    deleteScene: (act: string, sceneId: number) => void;
    addCommentToEvent: (index: number) => void;
    addActComment: (actId: string) => void;
    addSceneComment: (actId: string, sceneId: number) => void;
    updateEvent: (index: number, partial: Partial<ShowEvent>) => void;
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

    setEvents: (events) => set({ events }),
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
                            const transitionKey = `${fromEv.act}|${fromEv.sceneId ?? 0}|${fromEv.eventId ?? 0}`
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
        const currentEvent = newEvents[index]
        const prevEvent = activeEventIndex >= 0 ? events[activeEventIndex] : null
        const isNewEventGroup = !prevEvent ||
            prevEvent.act !== currentEvent.act ||
            prevEvent.sceneId !== currentEvent.sceneId ||
            prevEvent.eventId !== currentEvent.eventId

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
                const normalizedSceneId = e.sceneId ?? 0
                allGroupKeys.add(`act-${e.act}`)
                allGroupKeys.add(`scene-${e.act}-${normalizedSceneId}`)
            })
            const nextRuntimeCollapsed: Record<string, boolean> = {}
            allGroupKeys.forEach(k => { nextRuntimeCollapsed[k] = true })
            const currentSceneId = currentEvent.sceneId ?? 0
            nextRuntimeCollapsed[`act-${currentEvent.act}`] = false
            nextRuntimeCollapsed[`scene-${currentEvent.act}-${currentSceneId}`] = false
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
                nextRuntimeCollapsed[`act-${nextE.act}`] = false
                nextRuntimeCollapsed[`scene-${nextE.act}-${nextSceneId}`] = false
            }
            const eventUid = (e: ShowEvent) => `${e.act}-${e.sceneId ?? 0}-${e.eventId ?? 0}`
            const activeUid = eventUid(currentEvent)
            let nextUid: string | null = null
            if (nextGroupIdx !== -1) {
                nextUid = eventUid(newEvents[nextGroupIdx])
            }
            const eventGroupUids = new Set<string>()
            newEvents.forEach((e: ShowEvent) => eventGroupUids.add(eventUid(e)))
            eventGroupUids.forEach((u) => {
                nextRuntimeCollapsed[u] = u !== activeUid && u !== nextUid
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
        const { events, setActiveEvent } = get()
        if (!events || events.length === 0) return

        set({ timingRunStartedAt: Date.now(), stopButtonFlashRequest: false })

        // Always start at the very first act/scene/event group (often pre-show).
        const firstActName = events.find(e => e && e.act)?.act
        if (!firstActName) return

        const sceneIdFor = (e: ShowEvent) => (e.sceneId ?? 0)
        const eventIdFor = (e: ShowEvent) => (e.eventId ?? 0)

        const candidates = events.filter(e => e && e.act === firstActName)
        if (candidates.length === 0) return

        const minPositiveScene = Math.min(...candidates.map(e => sceneIdFor(e)).filter(n => n > 0))
        const targetSceneId = Number.isFinite(minPositiveScene) ? minPositiveScene : Math.min(...candidates.map(e => sceneIdFor(e)))

        const inTargetScene = candidates.filter(e => sceneIdFor(e) === targetSceneId)
        const minPositiveEvent = Math.min(...inTargetScene.map(e => eventIdFor(e)).filter(n => n > 0))
        const targetEventId = Number.isFinite(minPositiveEvent) ? minPositiveEvent : Math.min(...inTargetScene.map(e => eventIdFor(e)))

        const titleIdx = events.findIndex(e =>
            e.act === firstActName &&
            (e.sceneId ?? 0) === targetSceneId &&
            (e.eventId ?? 0) === targetEventId &&
            (e.type || '').toLowerCase() === 'title'
        )
        if (titleIdx !== -1) {
            setActiveEvent(titleIdx)
            return
        }
        const firstGroupIdx = events.findIndex(e =>
            e.act === firstActName &&
            (e.sceneId ?? 0) === targetSceneId &&
            (e.eventId ?? 0) === targetEventId
        )
        if (firstGroupIdx !== -1) setActiveEvent(firstGroupIdx)
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
                const actKey = `act-${target.act}`
                const sceneKey = `scene-${target.act}-${target.sceneId ?? 0}`
                const newRuntimeCollapsed: Record<string, boolean> = {}
                const acts = new Set(events.map((e: ShowEvent) => e.act))
                acts.forEach(a => newRuntimeCollapsed[`act-${a}`] = true)
                const scenes = new Set(events.map((e: ShowEvent) => `scene-${e.act}-${e.sceneId ?? 0}`))
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
        const { activeEventIndex, events, blinkingNextEvent, navigationWarning, setActiveEvent } = get()
        if (activeEventIndex >= events.length - 1) return
        if (!blinkingNextEvent && !force && navigationWarning !== 'event') {
            set({ navigationWarning: 'event' })
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
        const { activeEventIndex, events, blinkingNextScene, navigationWarning, setActiveEvent } = get()
        const current = events[activeEventIndex]
        if (!current) return
        if (!blinkingNextScene && !force && navigationWarning !== 'scene') {
            set({ navigationWarning: 'scene' })
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
        const { activeEventIndex, events, blinkingNextAct, navigationWarning, setActiveEvent } = get()
        const current = events[activeEventIndex]
        if (!current) return
        if (!blinkingNextAct && !force && navigationWarning !== 'act') {
            set({ navigationWarning: 'act' })
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
                const normalizedSceneId = e.sceneId ?? 0
                const normalizedEventId = e.eventId ?? 0
                newCollapsed[`act-${e.act}`] = false
                newCollapsed[`scene-${e.act}-${normalizedSceneId}`] = false
                newCollapsed[`${e.act}-${normalizedSceneId}-${normalizedEventId}`] = true
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
        new Set(events.map(e => e.act)).forEach((act: string) => {
            newCollapsed[`act-${act}`] = true
        })
        events.forEach(e => {
            const normalizedSceneId = e.sceneId ?? 0
            newCollapsed[`scene-${e.act}-${normalizedSceneId}`] = true
        })

        // Expand active act/scene.
        if (current) {
            newCollapsed[`act-${current.act}`] = false
            newCollapsed[`scene-${current.act}-${normalizedCurrentSceneId}`] = false
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
                newCollapsed[`act-${nextE.act}`] = false
                newCollapsed[`scene-${nextE.act}-${(nextE.sceneId ?? 0)}`] = false
            }
        }

        // Collapse event nodes (hide light/media).
        events.forEach(e => {
            const normalizedSceneId = e.sceneId ?? 0
            const normalizedEventId = e.eventId ?? 0
            newCollapsed[`${e.act}-${normalizedSceneId}-${normalizedEventId}`] = true
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
            const normalizedSceneId = e.sceneId ?? 0
            const normalizedEventId = e.eventId ?? 0
            newCollapsed[`act-${e.act}`] = false
            newCollapsed[`scene-${e.act}-${normalizedSceneId}`] = false
            newCollapsed[`${e.act}-${normalizedSceneId}-${normalizedEventId}`] = false
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
        const newEvent = { ...events[index], type, cue, fixture: '', effect: '', filename: '', duration: undefined, timingSamples: undefined }
        const newEvents = [...events]
        newEvents.splice(index, 0, newEvent)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addEventBelow: (index, type = 'Scene', cue = '') => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const newEvent = { ...events[index], type, cue, fixture: '', effect: '', filename: '', duration: undefined, timingSamples: undefined }
        const newEvents = [...events]
        newEvents.splice(index + 1, 0, newEvent)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    insertAct: (index, position) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const targetAct = events[index].act
        let insertAt = index
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (events[i].act === targetAct) insertAt = i + 1
                else break
            }
        } else {
            for (let i = index; i >= 0; i--) {
                if (events[i].act === targetAct) insertAt = i
                else break
            }
        }
        const newEvents = [...events]
        const newRows: ShowEvent[] = [
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Act', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Scene', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent,
            { act: 'Nieuwe Act', sceneId: 1, eventId: 1, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent
        ]
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
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (
                    events[i].act === target.act &&
                    events[i].sceneId === target.sceneId
                ) insertAt = i + 1
                else break
            }
        } else {
            for (let i = index; i >= 0; i--) {
                if (
                    events[i].act === target.act &&
                    events[i].sceneId === target.sceneId
                ) insertAt = i
                else break
            }
        }

        // 👉 NIEUW sceneId (tijdelijk — reindexEvents corrigeert)
        const newSceneId = (target.sceneId || 0) + 1

        const newRows: ShowEvent[] = [
            { act: target.act, sceneId: newSceneId, type: 'Scene', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true },
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true },
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false },
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true }
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

        let insertAt = index
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) insertAt = i + 1
                else break
            }
        } else {
            for (let i = index; i >= 0; i--) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) insertAt = i
                else break
            }
        }
        const newEvents = [...events]
        const newRows: ShowEvent[] = [
            { act: target.act, sceneId: target.sceneId, eventId: target.eventId, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: target.act, sceneId: target.sceneId, eventId: target.eventId, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent,
            { act: target.act, sceneId: target.sceneId, eventId: target.eventId, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent
        ]
        newEvents.splice(insertAt, 0, ...newRows)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    renameAct: (oldName, newName) => {
        const { events, setEvents, saveCurrentShow } = get()
        const newEvents = events.map((e: ShowEvent) => e.act === oldName ? { ...e, act: newName } : e)
        setEvents(newEvents)
        saveCurrentShow()
    },

    renameScene: (actName, sceneId, newDescription) => {
        const { activeShow, updateActiveShow } = get()
        if (!activeShow) return
        const sceneNames = { ...(activeShow.viewState?.sceneNames || {}) }
        sceneNames[`${actName}-${sceneId}`] = newDescription
        updateActiveShow({ viewState: { ...activeShow.viewState, sceneNames } })
    },

    moveAct: (actName, direction) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const actEvents = events.filter((e: ShowEvent) => e.act === actName)
        const firstIndex = events.findIndex((e: ShowEvent) => e.act === actName)
        const lastIndex = firstIndex + actEvents.length - 1
        let newEvents = [...events]
        if (direction === 'up' && firstIndex > 0) {
            const prevAct = events[firstIndex - 1].act
            const prevActEvents = events.filter((e: ShowEvent) => e.act === prevAct)
            newEvents.splice(firstIndex - prevActEvents.length, actEvents.length + prevActEvents.length, ...actEvents, ...prevActEvents)
        } else if (direction === 'down' && lastIndex < events.length - 1) {
            const nextAct = events[lastIndex + 1].act
            const nextActEvents = events.filter((e: ShowEvent) => e.act === nextAct)
            newEvents.splice(firstIndex, actEvents.length + nextActEvents.length, ...nextActEvents, ...actEvents)
        }
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    moveScene: (actName, sceneId, direction) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const sceneEvents = events.filter((e: ShowEvent) => e.act === actName && e.sceneId === sceneId)
        const firstIndex = events.findIndex((e: ShowEvent) => e.act === actName && e.sceneId === sceneId)
        const lastIndex = firstIndex + sceneEvents.length - 1
        let newEvents = [...events]
        if (direction === 'up' && firstIndex > 0 && events[firstIndex - 1].act === actName) {
            const prevSceneId = events[firstIndex - 1].sceneId
            if (prevSceneId !== undefined) {
                const prevSceneEvents = events.filter((e: ShowEvent) => e.act === actName && e.sceneId === prevSceneId)
                newEvents.splice(firstIndex - prevSceneEvents.length, sceneEvents.length + prevSceneEvents.length, ...sceneEvents, ...prevSceneEvents)
            }
        } else if (direction === 'down' && lastIndex < events.length - 1 && events[lastIndex + 1].act === actName) {
            const nextSceneId = events[lastIndex + 1].sceneId
            if (nextSceneId !== undefined) {
                const nextSceneEvents = events.filter((e: ShowEvent) => e.act === actName && e.sceneId === nextSceneId)
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
            !!e && e.act === act && e.sceneId === sceneId && e.eventId === eventId

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
            if (prev.act !== act || prev.sceneId !== sceneId) return

            const prevEventId = prev.eventId
            if (prevEventId === undefined) return
            const isSamePrevGroup = (e: ShowEvent | undefined) =>
                !!e && e.act === act && e.sceneId === sceneId && e.eventId === prevEventId

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
            if (next.act !== act || next.sceneId !== sceneId) return

            const nextEventId = next.eventId
            if (nextEventId === undefined) return
            const isSameNextGroup = (e: ShowEvent | undefined) =>
                !!e && e.act === act && e.sceneId === sceneId && e.eventId === nextEventId

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

    deleteAct: (act: string) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const acts = new Set(events.map((e: ShowEvent) => e.act))
        if (acts.size <= 1) return
        const newEvents = events.filter((e: ShowEvent) => e.act !== act)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    deleteScene: (act: string, sceneId: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const scenesInAct = new Set(events.filter((e: ShowEvent) => e.act === act && e.sceneId !== undefined).map((e: ShowEvent) => e.sceneId))
        if (scenesInAct.size <= 1) return
        const newEvents = events.filter((e: ShowEvent) => !(e.act === act && e.sceneId === sceneId))
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

    addActComment: (actId: string) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, addToast } = get()
        // Check if there's already a comment for this act (where sceneId is undefined or 0)
        const hasComment = events.some(e => e.act === actId && (!e.sceneId || e.sceneId === 0) && e.type?.toLowerCase() === 'comment')
        if (hasComment) {
            addToast('Er is al een commentaar-regel voor deze Act.', 'warning')
            return
        }

        // Find the insert position: right after the first row of this act
        const firstRowIndex = events.findIndex(e => e.act === actId)
        if (firstRowIndex === -1) return

        const newComment = { act: actId, type: 'Comment', cue: 'Nieuw act commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent

        const newEvents = [...events]
        newEvents.splice(firstRowIndex + 1, 0, newComment)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addSceneComment: (actId: string, sceneId: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow, addToast } = get()
        // Check if there's already a comment for this scene
        const hasComment = events.some(e => e.act === actId && e.sceneId === sceneId && (!e.eventId || e.eventId === 0) && e.type?.toLowerCase() === 'comment')
        if (hasComment) {
            addToast('Er is al een commentaar-regel voor deze Scene.', 'warning')
            return
        }

        // Find the insert position: right after the first row of this scene
        const firstRowIndex = events.findIndex(e => e.act === actId && e.sceneId === sceneId)
        if (firstRowIndex === -1) return

        const newComment = { act: actId, sceneId, type: 'Comment', cue: 'Nieuw scene commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent

        const newEvents = [...events]
        newEvents.splice(firstRowIndex + 1, 0, newComment)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    updateEvent: (index: number, partial: Partial<ShowEvent>) => {
        const { events, setEvents, saveCurrentShow } = get()
        const newEvents = [...events]
        newEvents[index] = { ...newEvents[index], ...partial }
        setEvents(newEvents)
        saveCurrentShow()
    },

    resendEvent: (index: number) => {
        const { events, eventStatuses } = get()
        const event = events[index]
        if (!event) return
        set({ eventStatuses: { ...eventStatuses, [index]: 'sending' } })
        setTimeout(() => set((s) => ({ eventStatuses: { ...s.eventStatuses, [index]: 'ok' } })), 500)
    },

    reindexEvents: () => {
        const { events, setEvents } = get()
        let currentAct = ''
        let currentSceneId = 0
        let currentEventId = 0
        let currentActionId = 0
        let actCounter = 0

        const actNamesMap = new Map<string, string>()

        const newEvents = events.map((e: ShowEvent) => {
            const type = e.type?.toLowerCase() || ''

            if (type === 'act') {
                actCounter++
                const isGeneric = e.act === 'Nieuwe Act' || /^Act\s+\d+$/i.test(e.act) || e.act === ''
                if (isGeneric) {
                    const newActName = `Act ${actCounter}`
                    actNamesMap.set(e.act, newActName)
                    currentAct = newActName
                } else {
                    currentAct = e.act
                }
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

            const finalAct = actNamesMap.get(e.act) || currentAct || e.act

            const updatedEvent: ShowEvent = {
                ...e,
                act: finalAct,
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
