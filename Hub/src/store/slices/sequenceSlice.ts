import type { StateCreator } from 'zustand';
import { type ShowState } from '../types';
import type { ShowEvent, ClipboardItem } from '../../types/show';
import { networkService } from '../../services/network-service';

export interface SequenceSlice {
    events: ShowEvent[];
    activeEventIndex: number;
    selectedEventIndex: number;
    isLocked: boolean;
    blinkingNextEvent: boolean;
    blinkingNextScene: boolean;
    blinkingNextAct: boolean;
    isTimeTracking: boolean;
    autoFollowScript: boolean;
    navigationWarning: 'event' | 'scene' | 'act' | null;
    lastTransitionTime: number | null;
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
    setSelectedEvent: (index: number) => void;
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
    blinkingNextEvent: false,
    blinkingNextScene: false,
    blinkingNextAct: false,
    isTimeTracking: false,
    autoFollowScript: true,
    navigationWarning: null,
    lastTransitionTime: null,
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
        const { events, activeEventIndex, actualStartTime, isPaused, isTimeTracking, lastTransitionTime, isLocked, saveCurrentShow, autoFollowScript, setCurrentScriptPage, updateBlinkRecommendations, broadcastState } = get()
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
                lastTransitionTime: null
            })
            return
        }
        if (index < 0 || index >= events.length) return
        let newEvents = events
        let newLastTransitionTime = lastTransitionTime
        if (isTimeTracking) {
            const now = Date.now()
            if (lastTransitionTime !== null && activeEventIndex !== -1 && activeEventIndex < events.length) {
                const durationSec = Math.round((now - lastTransitionTime) / 1000)
                if (durationSec > 0) {
                    const prevEvent = events[activeEventIndex]
                    if (prevEvent.duration !== durationSec) {
                        newEvents = [...events]
                        newEvents[activeEventIndex] = { ...prevEvent, duration: durationSec }
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

        // --- Auto-trigger Logic ---
        // When a new event is started (group change), automatically trigger all media and light blocks in that event.
        if (isHost && isLocked && isNewEventGroup) {
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
                allGroupKeys.add(`act-${e.act}`)
                allGroupKeys.add(`scene-${e.act}-${e.sceneId}`)
            })
            const nextRuntimeCollapsed: Record<string, boolean> = {}
            allGroupKeys.forEach(k => nextRuntimeCollapsed[k] = true)
            nextRuntimeCollapsed[`act-${currentEvent.act}`] = false
            nextRuntimeCollapsed[`scene-${currentEvent.act}-${currentEvent.sceneId}`] = false
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
                nextRuntimeCollapsed[`act-${nextE.act}`] = false
                nextRuntimeCollapsed[`scene-${nextE.act}-${nextE.sceneId}`] = false
            }
            updates.runtimeCollapsedGroups = nextRuntimeCollapsed
        }
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

    setSelectedEvent: (index) => set({ selectedEventIndex: index }),

    setLocked: async (isLocked) => {
        const { activeShow, events, activeEventIndex, saveCurrentShow, broadcastState } = get()
        set({ isLocked })
        broadcastState()

        if (isLocked) {
            await saveCurrentShow()
            const targetIndex = activeEventIndex >= 0 ? activeEventIndex : 0
            if (events && events.length > 0) {
                const target = events[targetIndex]
                const actKey = `act-${target.act}`
                const sceneKey = `scene-${target.act}-${target.sceneId}`
                const newRuntimeCollapsed: Record<string, boolean> = {}
                const acts = new Set(events.map((e: ShowEvent) => e.act))
                acts.forEach(a => newRuntimeCollapsed[`act-${a}`] = true)
                const scenes = new Set(events.map((e: ShowEvent) => `scene-${e.act}-${e.sceneId}`))
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
        const next = events.find((e: ShowEvent, i: number) => i > activeEventIndex && (e.act !== current.act || e.sceneId !== current.sceneId || e.eventId !== current.eventId))
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
        const nextSceneEvent = events.find((e: ShowEvent, i: number) => i > activeEventIndex && (e.act !== current.act || e.sceneId > current.sceneId))
        if (nextSceneEvent) {
            setActiveEvent(events.indexOf(nextSceneEvent))
        }
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
        const nextActEvent = events.find((e: ShowEvent, i: number) => i > activeEventIndex && e.act !== current.act)
        if (nextActEvent) {
            setActiveEvent(events.indexOf(nextActEvent))
        }
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
                if (e.sceneId === current.sceneId && e.eventId > current.eventId && nextEventIdx === -1) nextEventIdx = i
                if (e.sceneId > current.sceneId && nextSceneIdx === -1) nextSceneIdx = i
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
        set({ runtimeCollapsedGroups: newCollapsed })
        if (!isLocked && activeShow) {
            updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: newCollapsed } })
        }
    },

    collapseAll: () => {
        const { events, activeShow, isLocked, updateActiveShow } = get()
        const newCollapsed: Record<string, boolean> = {}
        events.forEach(e => {
            newCollapsed[`act-${e.act}`] = false
            newCollapsed[`scene-${e.act}-${e.sceneId}`] = false
            newCollapsed[`${e.act}-${e.sceneId}-${e.eventId}`] = true
        })
        set({ runtimeCollapsedGroups: newCollapsed })
        if (!isLocked && activeShow) {
            updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: newCollapsed } })
        }
    },

    expandAll: () => {
        const { activeShow, isLocked, updateActiveShow } = get()
        set({ runtimeCollapsedGroups: {} })
        if (!isLocked && activeShow) {
            updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: {} } })
        }
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
        const newEvent = { ...events[index], type, cue, fixture: '', effect: '', filename: '', duration: undefined }
        const newEvents = [...events]
        newEvents.splice(index, 0, newEvent)
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addEventBelow: (index, type = 'Scene', cue = '') => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const newEvent = { ...events[index], type, cue, fixture: '', effect: '', filename: '', duration: undefined }
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
        const newSceneId = target.sceneId + 1

        const newRows: ShowEvent[] = [
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Scene', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Title', cue: 'Nieuw Event', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent,
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Comment', cue: 'Nieuw commentaar', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false } as ShowEvent,
            { act: target.act, sceneId: newSceneId, eventId: 1, type: 'Trigger', cue: 'Handmatige overgang', fixture: '', effect: '', palette: '', color1: '#000000', color2: '#000000', color3: '#000000', brightness: 100, speed: 100, intensity: 100, transition: 0, sound: true } as ShowEvent
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
            const prevSceneEvents = events.filter((e: ShowEvent) => e.act === actName && e.sceneId === prevSceneId)
            newEvents.splice(firstIndex - prevSceneEvents.length, sceneEvents.length + prevSceneEvents.length, ...sceneEvents, ...prevSceneEvents)
        } else if (direction === 'down' && lastIndex < events.length - 1 && events[lastIndex + 1].act === actName) {
            const nextSceneId = events[lastIndex + 1].sceneId
            const nextSceneEvents = events.filter((e: ShowEvent) => e.act === actName && e.sceneId === nextSceneId)
            newEvents.splice(firstIndex, sceneEvents.length + nextSceneEvents.length, ...nextSceneEvents, ...sceneEvents)
        }
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    moveEvent: (index, direction) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        if (direction === 'up' && index > 0) {
            const newEvents = [...events]
            const [moved] = newEvents.splice(index, 1)
            newEvents.splice(index - 1, 0, moved)
            setEvents(newEvents)
            reindexEvents()
            saveCurrentShow()
        } else if (direction === 'down' && index < events.length - 1) {
            const newEvents = [...events]
            const [moved] = newEvents.splice(index, 1)
            newEvents.splice(index + 1, 0, moved)
            setEvents(newEvents)
            reindexEvents()
            saveCurrentShow()
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
        const scenesInAct = new Set(events.filter((e: ShowEvent) => e.act === act).map((e: ShowEvent) => e.sceneId))
        if (scenesInAct.size <= 1) return
        const newEvents = events.filter((e: ShowEvent) => !(e.act === act && e.sceneId === sceneId))
        setEvents(newEvents)
        reindexEvents()
        saveCurrentShow()
    },

    addCommentToEvent: (index: number) => {
        const { events, setEvents, reindexEvents, saveCurrentShow } = get()
        const target = events[index]
        const newComment = { act: target.act, sceneId: target.sceneId, eventId: target.eventId, type: 'Comment', fixture: '', effect: '', palette: '', color1: '#ffffff', color2: '#ffffff', color3: '#ffffff', brightness: 0, speed: 0, intensity: 0, transition: 0, sound: false, cue: 'Nieuw commentaar' } as ShowEvent
        const newEvents = [...events]
        newEvents.splice(index + 1, 0, newComment)
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
        let currentAct = '', currentSceneId = 0, currentEventId = 0
        let actCounter = 0
        const actNamesMap = new Map<string, string>()
        let isFirstInScene = true
        let isFirstSceneInAct = true

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
                currentSceneId = 1
                currentEventId = 1
                isFirstSceneInAct = true
                isFirstInScene = true
            } else if (type === 'scene') {
                if (isFirstSceneInAct) {
                    isFirstSceneInAct = false
                    currentSceneId = 1
                } else {
                    currentSceneId++
                }
                currentEventId = 1
                isFirstInScene = true
            } else if (type === 'title') {
                if (!isFirstInScene) {
                    currentEventId++
                }
                isFirstInScene = false
                isFirstSceneInAct = false
            }

            const finalAct = actNamesMap.get(e.act) || currentAct || e.act

            return {
                ...e,
                act: finalAct,
                sceneId: currentSceneId || e.sceneId,
                eventId: currentEventId || e.eventId
            }
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
