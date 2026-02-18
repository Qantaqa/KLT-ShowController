import { create } from 'zustand'
import type { ShowEvent } from '../services/xml-service'
import { networkService } from '../services/network-service'
import { XmlService } from '../services/xml-service'
import * as MediaPlayer from '../services/media-player-service'


export type DeviceType = 'wled' | 'wiz' | 'local_monitor' | 'remote_ledwall'

export interface BaseDevice {
    id: string
    name: string
    type: DeviceType
    enabled: boolean
    mac?: string
}

export interface WLEDDevice extends BaseDevice {
    type: 'wled'
    ip: string
    segments: {
        id: number
        name: string
    }[]
}

export interface WiZDevice extends BaseDevice {
    type: 'wiz'
    ip: string
}

export interface LocalMonitorDevice extends BaseDevice {
    type: 'local_monitor'
    monitorId: number
}

export interface RemoteLedwallDevice extends BaseDevice {
    type: 'remote_ledwall'
    ip: string
    width: number
    height: number
    orientation: 'landscape' | 'portrait'
}

export type Device = WLEDDevice | WiZDevice | LocalMonitorDevice | RemoteLedwallDevice

export interface ShowProfile {
    id: string
    name: string
    pdfPath: string
    sidebarWidth?: number
    invertScriptColors?: boolean
    schedule?: Record<number, { time1: string; time2: string }> // 0 = Sunday, 1 = Monday, etc.
    viewState?: {
        collapsedGroups?: Record<string, boolean>
        currentScriptPage?: number
    }
    devices?: Device[]
}

export interface AppSettingsProfile {
    defaultLogo: string
    accessPin: string // '0000' default
    serverPort: number // 3001 default
    serverIp: string // 'localhost' default
    controllerMonitorIndex?: number // 0 = primary
    testVideoPath?: string
}

interface ShowState {
    events: ShowEvent[]
    activeEventIndex: number
    isLocked: boolean

    // Indicators for blinking buttons
    blinkingNextEvent: boolean
    blinkingNextScene: boolean
    blinkingNextAct: boolean

    // Current Show Metadata
    activeShow: ShowProfile | null
    availableShows: ShowProfile[]

    // App Global Settings
    appSettings: AppSettingsProfile

    // Show Timing State
    showStartTime: string // "HH:mm" - Still used as "Next Show Time" display
    actualStartTime: number | null // Timestamp when first event triggered
    isPaused: boolean
    pauseStartTime: number | null // Timestamp when pause started
    isTimeTracking: boolean
    lastTransitionTime: number | null

    // Navigation Safety & Warnings
    navigationWarning: 'event' | 'scene' | 'act' | null

    // UI State
    autoFollowScript: boolean

    // Status tracking for network events
    eventStatuses: Record<number, 'sending' | 'ok' | 'failed' | null>
    connectedClients: string[]

    // Actions
    setEvents: (events: ShowEvent[]) => void
    setActiveEvent: (index: number) => void
    setLocked: (locked: boolean) => void
    setShowStartTime: (time: string) => void
    nextEvent: (force?: boolean) => void
    nextScene: (force?: boolean) => void
    nextAct: (force?: boolean) => void
    toggleCollapse: (id: string) => void
    updateBlinkRecommendations: (activeIndex: number) => void

    // Camera Sharing State
    isCameraActive: boolean


    activeCameraStreams: Record<string, string> // clientId -> base64 frame
    selectedCameraClients: string[] // List of up to 2 client IDs we want to see

    // Show management
    setActiveShow: (show: ShowProfile) => void
    updateActiveShow: (partial: Partial<ShowProfile>) => void
    updateActiveShowPdf: (path: string) => void
    updateActiveShowSidebarWidth: (width: number) => void
    createNewShow: (name: string) => Promise<void>
    archiveShow: (id: string) => Promise<void>
    deleteProject: (id: string) => Promise<void>
    saveCurrentShow: () => Promise<void>
    initializeShows: () => Promise<void>
    updateAppSettings: (partial: Partial<AppSettingsProfile>) => Promise<void>
    importShow: (name: string, xmlContent: string) => Promise<void>

    // Device actions
    addDevice: (device: Device) => void
    updateDevice: (id: string, partial: Partial<Device>) => void
    deleteDevice: (id: string) => void

    // CRUD & Remote actions
    addEventAbove: (index: number, type?: string, cue?: string) => void
    addEventBelow: (index: number, type?: string, cue?: string) => void
    insertAct: (index: number, position: 'before' | 'after') => void
    insertScene: (index: number, position: 'before' | 'after') => void
    insertEvent: (index: number, position: 'before' | 'after') => void

    // New Actions
    renameAct: (oldName: string, newName: string) => void
    renameScene: (actName: string, sceneId: number, newDescription: string) => void
    moveAct: (actName: string, direction: 'up' | 'down') => void
    moveScene: (actName: string, sceneId: number, direction: 'up' | 'down') => void
    moveEvent: (index: number, direction: 'up' | 'down') => void

    deleteEvent: (index: number) => void
    deleteGroup: (act: string, sceneId: number, eventId: number) => void
    deleteAct: (act: string) => void
    deleteScene: (act: string, sceneId: number) => void
    updateEvent: (index: number, partial: Partial<ShowEvent>) => void
    resendEvent: (index: number) => void

    // Media Controls
    restartMedia: (index: number) => void
    stopMedia: (index: number) => void
    stopAllMedia: () => void
    setMediaVolume: (index: number, volume: number) => void
    toggleAudio: (index: number) => void
    toggleRepeat: (index: number) => void
    startProjection: (deviceId: string, monitorIndex: number) => void
    toggleTimeTracking: () => void
    toggleAutoFollowScript: () => void
    setCurrentScriptPage: (page: number) => void
    syncFromRemote: (state: { activeShow: ShowProfile, events: ShowEvent[], activeEventIndex: number, isLocked: boolean, blinkingNextEvent: boolean, blinkingNextScene: boolean, blinkingNextAct: boolean, navigationWarning: 'event' | 'scene' | 'act' | null, lastTransitionTime: number | null }) => void
    syncAppSettings: (settings: AppSettingsProfile) => void
    setConnectedClients: (ids: string[]) => void
    broadcastState: () => void

    mediaAction: (deviceId: string, action: string, payload?: any) => void

    // Camera Actions
    setCameraActive: (active: boolean) => void
    updateCameraFrame: (clientId: string, frame: string) => void
    clearCameraStream: (clientId: string) => void
    toggleCameraSelection: (clientId: string) => void

    // Toast Messages
    toasts: { id: string, type: 'info' | 'warning' | 'error', message: string }[]
    addToast: (message: string, type?: 'info' | 'warning' | 'error') => void
    removeToast: (id: string) => void
}

const DEFAULT_SHOWS: ShowProfile[] = []

export const useShowStore = create<ShowState>((set, get) => ({
    events: [],
    activeEventIndex: -1,
    isLocked: true,
    blinkingNextEvent: false,
    blinkingNextScene: false,
    blinkingNextAct: false,
    isTimeTracking: false,
    autoFollowScript: true,
    lastTransitionTime: null,
    navigationWarning: null,
    activeShow: null,
    availableShows: DEFAULT_SHOWS,
    eventStatuses: {},
    connectedClients: [],
    appSettings: {
        defaultLogo: '',
        accessPin: '',
        serverPort: 3001,
        serverIp: 'localhost',
        controllerMonitorIndex: 0
    },

    isCameraActive: false,
    activeCameraStreams: {},
    selectedCameraClients: [],

    showStartTime: "19:30",
    actualStartTime: null,
    isPaused: false,
    pauseStartTime: null,

    setEvents: (events) => set({ events }),
    setLocked: async (isLocked) => {
        set({ isLocked })
        get().broadcastState()
        if (isLocked) {
            await get().saveCurrentShow()
        }
    },
    toggleTimeTracking: () => set(state => ({ isTimeTracking: !state.isTimeTracking })),
    toggleAutoFollowScript: () => set(state => ({ autoFollowScript: !state.autoFollowScript })),

    setShowStartTime: (showStartTime) => set({ showStartTime }),
    setCurrentScriptPage: (page: number) => set({
        activeShow: get().activeShow ? { ...get().activeShow!, viewState: { ...get().activeShow?.viewState, currentScriptPage: page } } : null
    } as any),

    syncFromRemote: (state) => {
        set({
            activeShow: state.activeShow,
            events: state.events,
            activeEventIndex: state.activeEventIndex,
            isLocked: state.isLocked,
            blinkingNextEvent: state.blinkingNextEvent,
            blinkingNextScene: state.blinkingNextScene,
            blinkingNextAct: state.blinkingNextAct,
            navigationWarning: state.navigationWarning,
            lastTransitionTime: state.lastTransitionTime
        })
    },

    syncAppSettings: (appSettings) => {
        set({ appSettings })
    },

    setConnectedClients: (ids) => set({ connectedClients: ids }),

    setCameraActive: (active) => set({ isCameraActive: active }),
    updateCameraFrame: (clientId, frame) => set(state => ({
        activeCameraStreams: { ...state.activeCameraStreams, [clientId]: frame }
    })),
    clearCameraStream: (clientId) => set(state => {
        const streams = { ...state.activeCameraStreams }
        delete streams[clientId]
        // Keep in selectedCameraClients so we show the "Camera Off" placeholder
        // const selected = state.selectedCameraClients.filter(id => id !== clientId)
        return { activeCameraStreams: streams }
    }),
    toggleCameraSelection: (clientId) => set(state => {
        const selected = [...state.selectedCameraClients]
        if (selected.includes(clientId)) {
            return { selectedCameraClients: selected.filter(id => id !== clientId) }
        } else {
            if (selected.length >= 2) selected.shift()
            selected.push(clientId)
            return { selectedCameraClients: selected }
        }
    }
    ),

    toasts: [],
    addToast: (message, type = 'info') => {
        const id = Math.random().toString(36).substring(7)
        set(state => ({ toasts: [...state.toasts, { id, type, message }] }))
        setTimeout(() => get().removeToast(id), 5000)
    },
    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

    broadcastState: () => {
        const { activeShow, events, activeEventIndex, isLocked, appSettings, blinkingNextEvent, blinkingNextScene, blinkingNextAct, navigationWarning, lastTransitionTime } = get()
        if (activeShow) {
            // For remote clients: replace localhost in logo URL with the actual server IP
            const remoteAppSettings = { ...appSettings }
            if (remoteAppSettings.defaultLogo && remoteAppSettings.defaultLogo.includes('localhost')) {
                const serverIp = remoteAppSettings.serverIp || 'localhost'
                remoteAppSettings.defaultLogo = remoteAppSettings.defaultLogo.replace('localhost', serverIp)
            }
            networkService.sendCommand({
                type: 'STATE_SYNC',
                state: { activeShow, events, activeEventIndex, isLocked, appSettings: remoteAppSettings, blinkingNextEvent, blinkingNextScene, blinkingNextAct, navigationWarning, lastTransitionTime }
            })
        }
    },


    setActiveEvent: (index) => {
        const { events, activeEventIndex, actualStartTime, isPaused, isTimeTracking, lastTransitionTime } = get()

        // Stop/Reset: index -1 resets the show
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

        // Time Tracking Logic: Record duration of PREVIOUS event (only when time tracking is active)
        if (isTimeTracking) {
            const now = Date.now()
            if (lastTransitionTime !== null && activeEventIndex !== -1 && activeEventIndex < events.length) {
                const durationSec = Math.round((now - lastTransitionTime) / 1000)
                if (durationSec > 0) {
                    // Check if duration actually changed to avoid unnecessary writes
                    const prevEvent = events[activeEventIndex]
                    if (prevEvent.duration !== durationSec) {
                        newEvents = [...events]
                        newEvents[activeEventIndex] = { ...prevEvent, duration: durationSec }
                        // We will save this change below
                    }
                }
            }
        }
        // Always update lastTransitionTime so countdown works even without time tracking
        newLastTransitionTime = Date.now()

        const currentEvent = newEvents[index]
        const updates: Partial<ShowState> = {
            events: newEvents,
            activeEventIndex: index,
            navigationWarning: null,
            lastTransitionTime: newLastTransitionTime
        }

        if (newEvents !== events) {
            get().saveCurrentShow()
        }

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

        set(updates)

        // Trigger Media if active event is media type
        // ---------------------------------------------------------
        // MEDIA TRIGGER LOGIC
        // ---------------------------------------------------------
        // When a row becomes active, we trigger ALL media events in the same group.
        // A group is defined by [Act, Scene, EventId].
        const activeGroupEvents = newEvents.filter(e =>
            e.act === currentEvent.act &&
            e.sceneId === currentEvent.sceneId &&
            e.eventId === currentEvent.eventId
        )

        const { activeShow } = get()
        const devices = activeShow?.devices || []

        const getMediaUrl = (path: string) => {
            if (!path) return ''
            if (path.startsWith('http') || path.startsWith('file') || path.startsWith('ledshow-file')) return path
            return `ledshow-file:///${path.replace(/\\/g, '/')}`
        }

        activeGroupEvents.forEach(evt => {
            if (evt.type?.toLowerCase() === 'media' && evt.filename) {
                const targetName = (evt.fixture || '').trim().toLowerCase()

                // Find matching devices (Local Monitor or Remote Ledwall)
                const targets = devices.filter(d => {
                    const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
                    const isEnabled = (d as any).enabled !== false
                    const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                    return isTypeMatch && isEnabled && isNameMatch
                })

                if (targets.length === 0 && targetName) {
                    console.warn(`No target devices found for media fixture: "${targetName}"`)
                }

                targets.forEach(device => {
                    const mediaUrl = getMediaUrl(evt.filename || '')
                    const repeat = evt.effect === 'repeat'
                    const volume = evt.intensity !== undefined ? evt.intensity : 100

                    if (device.type === 'local_monitor') {
                        MediaPlayer.StartMediaPlayer(device, mediaUrl, repeat, volume, 0, undefined, evt.transition);
                    } else if (device.type === 'remote_ledwall') {
                        networkService.sendCommand({
                            type: 'MEDIA_CONTROL',
                            action: 'play',
                            payload: {
                                url: mediaUrl,
                                loop: repeat,
                                volume: volume,
                                mute: !evt.sound,
                                deviceId: device.id
                            }
                        })
                    }
                })
            }
        })
        // ---------------------------------------------------------

        get().updateBlinkRecommendations(index)
    },

    updateBlinkRecommendations: (activeIndex: number) => {
        const { events } = get()
        const current = events[activeIndex]
        if (!current) return

        let nextEventIdx = -1
        let nextSceneIdx = -1
        let nextActIdx = -1

        for (let i = activeIndex + 1; i < events.length; i++) {
            const e = events[i]
            if (e.act === current.act && e.sceneId === current.sceneId && e.eventId === current.eventId) {
                continue
            }

            if (e.act === current.act) {
                if (e.sceneId === current.sceneId && e.eventId > current.eventId && nextEventIdx === -1) {
                    nextEventIdx = i
                }
                if (e.sceneId > current.sceneId && nextSceneIdx === -1) {
                    nextSceneIdx = i
                }
            } else if (nextActIdx === -1) {
                nextActIdx = i
            }
        }

        set({
            blinkingNextEvent: nextEventIdx !== -1,
            blinkingNextScene: nextEventIdx === -1 && nextSceneIdx !== -1,
            blinkingNextAct: nextEventIdx === -1 && nextSceneIdx === -1 && nextActIdx !== -1
        })
    },

    nextEvent: (force = false) => {
        const { activeEventIndex, events, blinkingNextEvent, navigationWarning } = get()
        if (activeEventIndex >= events.length - 1) return

        if (!blinkingNextEvent && !force && navigationWarning !== 'event') {
            set({ navigationWarning: 'event' })
            return
        }

        const current = events[activeEventIndex]
        const next = events.find((e, i) => i > activeEventIndex && (e.act !== current.act || e.sceneId !== current.sceneId || e.eventId !== current.eventId))
        if (next) {
            get().setActiveEvent(events.indexOf(next))
        } else {
            get().setActiveEvent(activeEventIndex + 1)
        }
    },

    nextScene: (force = false) => {
        const { activeEventIndex, events, blinkingNextScene, navigationWarning } = get()
        const current = events[activeEventIndex]
        if (!current) return

        if (!blinkingNextScene && !force && navigationWarning !== 'scene') {
            set({ navigationWarning: 'scene' })
            return
        }

        const nextSceneEvent = events.find((e, i) => i > activeEventIndex && (e.act !== current.act || e.sceneId > current.sceneId))
        if (nextSceneEvent) {
            get().setActiveEvent(events.indexOf(nextSceneEvent))
        }
    },

    nextAct: (force = false) => {
        const { activeEventIndex, events, blinkingNextAct, navigationWarning } = get()
        const current = events[activeEventIndex]
        if (!current) return

        if (!blinkingNextAct && !force && navigationWarning !== 'act') {
            set({ navigationWarning: 'act' })
            return
        }

        const nextActEvent = events.find((e, i) => i > activeEventIndex && e.act !== current.act)
        if (nextActEvent) {
            get().setActiveEvent(events.indexOf(nextActEvent))
        }
    },

    setActiveShow: async (show) => {
        set({ activeShow: show })
        if (show && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            let events = await ipcRenderer.invoke('db:get-sequences', show.id)

            // Als er geen events zijn, maak dan een standaard groep aan
            if (!events || events.length === 0) {
                events = [
                    {
                        act: 'Act 1', sceneId: 1, eventId: 1, type: 'Title', cue: 'Start',
                        fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                        brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
                    },
                    {
                        act: 'Act 1', sceneId: 1, eventId: 1, type: 'Comment', cue: 'Opmerkingen',
                        fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                        brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
                    }
                ]

                try {
                    await ipcRenderer.invoke('db:save-sequences', { showId: show.id, events })
                } catch (err) {
                    console.error('Failed to auto-create default group:', err)
                }
            }

            const devices = await ipcRenderer.invoke('db:get-devices', show.id)
            set({ events, activeShow: { ...show, devices } })
            localStorage.setItem('ledshow_last_show_id', show.id)
        }
    },

    updateActiveShow: (partial) => {
        const { activeShow, availableShows } = get()
        if (activeShow) {
            const updated = { ...activeShow, ...partial }
            const newAvailable = availableShows.map(s => s.id === activeShow.id ? updated : s)
            set({
                activeShow: updated,
                availableShows: newAvailable
            })
            get().saveCurrentShow()
        }
    },

    updateActiveShowPdf: (path) => get().updateActiveShow({ pdfPath: path }),
    updateActiveShowSidebarWidth: (width) => get().updateActiveShow({ sidebarWidth: width }),

    toggleCollapse: (id) => {
        const { activeShow } = get()
        if (activeShow) {
            const currentGroups = activeShow.viewState?.collapsedGroups || {}
            const newGroups = { ...currentGroups, [id]: !currentGroups[id] }
            get().updateActiveShow({
                viewState: { ...activeShow.viewState, collapsedGroups: newGroups }
            })
        }
    },

    createNewShow: async (name) => {
        const trimmedName = (name || '').trim()
        if (!trimmedName) {
            console.error('--- STORE: createNewShow REJECTED - empty name ---')
            throw new Error('Show naam mag niet leeg zijn')
        }
        console.log('--- STORE: createNewShow ---', trimmedName)
        const newId = `show_${Date.now()}`
        const newShow: ShowProfile = {
            id: newId,
            name: trimmedName,
            pdfPath: '',
            sidebarWidth: 500,
            invertScriptColors: false,
            schedule: {},
            devices: []
        }

        const initialEvents: ShowEvent[] = [
            {
                act: 'Act 1', sceneId: 1, eventId: 1, type: 'Title', cue: 'Start',
                fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
                brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
            }
        ]

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            console.log('--- STORE: invoking db:create-show ---')
            await ipcRenderer.invoke('db:create-show', newShow)
            console.log('--- STORE: invoking db:save-sequences ---')
            await ipcRenderer.invoke('db:save-sequences', { showId: newId, events: initialEvents })
        }

        set(state => {
            console.log('--- STORE: updating state with new show ---')
            return {
                availableShows: [...state.availableShows, newShow],
                activeShow: newShow,
                events: initialEvents,
                activeEventIndex: -1,
                isLocked: false
            }
        })
        localStorage.setItem('ledshow_last_show_id', newId)
        console.log('--- STORE: createNewShow DONE ---')
    },

    archiveShow: async (id: string) => {
        const { availableShows, activeShow } = get()
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:archive-show', { id, archived: true })
        }

        const newAvailable = availableShows.filter(s => s.id !== id)
        if (activeShow?.id === id) {
            const nextShow = newAvailable.length > 0 ? newAvailable[0] : null
            set({ availableShows: newAvailable, activeShow: nextShow })
            if (nextShow) {
                get().setActiveShow(nextShow)
            } else {
                set({ events: [] })
                localStorage.removeItem('ledshow_last_show_id')
            }
        } else {
            set({ availableShows: newAvailable })
        }
    },

    deleteProject: async (id: string) => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:delete-show', id)
        }
        const { availableShows, activeShow } = get()
        const newAvailable = availableShows.filter(s => s.id !== id)
        if (activeShow?.id === id) {
            set({ availableShows: newAvailable, activeShow: null, events: [] })
            localStorage.removeItem('ledshow_last_show_id')
        } else {
            set({ availableShows: newAvailable })
        }
    },

    saveCurrentShow: async () => {
        const { activeShow, events } = get()
        if (activeShow && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:update-show', {
                id: activeShow.id,
                partial: {
                    name: activeShow.name,
                    pdfPath: activeShow.pdfPath,
                    sidebarWidth: activeShow.sidebarWidth,
                    invertScriptColors: activeShow.invertScriptColors ? 1 : 0,
                    schedule: JSON.stringify(activeShow.schedule || {}),
                    viewState: JSON.stringify(activeShow.viewState || {})
                }
            })
            await ipcRenderer.invoke('db:save-sequences', { showId: activeShow.id, events })
            if (activeShow.devices) {
                await ipcRenderer.invoke('db:save-devices', { showId: activeShow.id, devices: activeShow.devices })
            }
        }
    },

    initializeShows: async () => {
        console.log('--- STORE: initializeShows START ---')
        if (!(window as any).require) {
            console.warn('--- STORE: Electron not detected, skipping DB init ---')
            return
        }
        const { ipcRenderer } = (window as any).require('electron')
        try {
            console.log('--- STORE: fetching shows from DB ---')
            const dbShows: any[] = await ipcRenderer.invoke('db:get-shows')
            console.log('--- STORE: found', dbShows.length, 'shows in DB ---', dbShows.map(s => ({ id: s.id, name: s.name, archived: s.archived })))

            const safeJsonParse = (val: any, fallback: any = {}) => {
                if (val === null || val === undefined) return fallback
                if (typeof val === 'object') return val // Already parsed by db-manager
                if (typeof val === 'string') {
                    try { return JSON.parse(val) } catch { return fallback }
                }
                return fallback
            }

            const available: ShowProfile[] = dbShows.map(s => ({
                ...s,
                invertScriptColors: !!s.invertScriptColors,
                schedule: safeJsonParse(s.schedule, {}),
                viewState: safeJsonParse(s.viewState, {})
            }))

            console.log('--- STORE: mapped', available.length, 'available shows ---', available.map(s => s.name))

            const lastShowId = localStorage.getItem('ledshow_last_show_id')
            console.log('--- STORE: lastShowId from localStorage:', lastShowId)

            let active = lastShowId ? available.find(s => s.id === lastShowId) || null : null
            console.log('--- STORE: active show selected:', active?.name || 'NONE')

            const appSettings = await ipcRenderer.invoke('db:get-app-settings')

            // Migrate old ledshow-file:// logo URLs to HTTP URL (works for both host and remote clients)
            if (appSettings?.defaultLogo && appSettings.defaultLogo.startsWith('ledshow-file://')) {
                const port = (appSettings.serverPort || 3001) + 1 // FILE_PORT = SOCKET_PORT + 1
                appSettings.defaultLogo = `http://localhost:${port}/logo`
                // Save migrated URL back to DB
                await ipcRenderer.invoke('db:update-app-settings', appSettings)
                console.log('--- STORE: migrated logo URL to HTTP ---')
            }

            // Set available shows and app settings first; 
            // Also clear events if no active show to prevent stale data
            set({
                availableShows: available,
                activeShow: null,
                events: [],
                activeEventIndex: -1,
                appSettings
            })

            if (active) {
                console.log('--- STORE: loading data for active show ---')
                await get().setActiveShow(active)
            }
            console.log('--- STORE: initializeShows DONE ---')
        } catch (err) {
            console.error('--- STORE: initializeShows FAILED ---', err)
        }
    },

    updateAppSettings: async (partial) => {
        const newSettings = { ...get().appSettings, ...partial }
        set({ appSettings: newSettings })
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:update-app-settings', newSettings)
        }
    },

    importShow: async (name, xmlContent) => {
        const trimmedName = (name || '').trim()
        if (!trimmedName) {
            throw new Error('Show naam mag niet leeg zijn')
        }
        const xmlService = new XmlService()
        const importedEvents = xmlService.parseShow(xmlContent)
        const newId = `show_${Date.now()}`
        const newShow: ShowProfile = { id: newId, name: trimmedName, pdfPath: '', sidebarWidth: 500, invertScriptColors: false, schedule: {}, devices: [] }

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            await ipcRenderer.invoke('db:create-show', newShow)
            await ipcRenderer.invoke('db:save-sequences', { showId: newId, events: importedEvents })
        }

        set(state => ({
            availableShows: [...state.availableShows, newShow],
            activeShow: newShow,
            events: importedEvents,
            activeEventIndex: -1
        }))
        localStorage.setItem('ledshow_last_show_id', newId)
    },

    addDevice: (device) => {
        const { activeShow } = get()
        if (activeShow) {
            const devices = [...(activeShow.devices || []), device]
            get().updateActiveShow({ devices })
        }
    },

    updateDevice: (id, partial) => {
        const { activeShow } = get()
        if (activeShow?.devices) {
            const devices = activeShow.devices.map(d => d.id === id ? { ...d, ...partial } as Device : d)
            get().updateActiveShow({ devices })
        }
    },

    deleteDevice: (id) => {
        const { activeShow } = get()
        if (activeShow?.devices) {
            const devices = activeShow.devices.filter(d => d.id !== id)
            get().updateActiveShow({ devices })
        }
    },

    addEventAbove: (index, type = 'Scene', cue = '') => {
        const { events, isLocked } = get()
        if (isLocked) return
        const newEvents = [...events]
        newEvents.splice(index, 0, { ...events[index], type, cue })
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    addEventBelow: (index, type = 'Scene', cue = '') => {
        const { events, isLocked } = get()
        if (isLocked) return
        const newEvents = [...events]
        newEvents.splice(index + 1, 0, { ...events[index], type, cue })
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    insertAct: (index, position) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]

        // Find the boundary of the current group
        let insertIdx = index
        if (position === 'after') {
            // Find last index of this group
            for (let i = index; i < events.length; i++) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                    insertIdx = i
                } else {
                    break
                }
            }
            insertIdx += 1 // Insert AFTER the last item
        } else {
            // Find first index of this group
            for (let i = index; i >= 0; i--) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                    insertIdx = i
                } else {
                    break
                }
            }
        }

        const newActNum = parseInt(target.act.replace('Act ', '')) + (position === 'after' ? 1 : 0)
        const newEvent: ShowEvent = {
            act: `Act ${newActNum}`, sceneId: 1, eventId: 1, type: 'Title', cue: 'New Act',
            fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
            brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
        }

        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newEvent)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    insertScene: (index, position) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]

        // Find insertion point outside the group
        let insertIdx = index
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                    insertIdx = i
                } else {
                    break
                }
            }
            insertIdx += 1
        } else {
            for (let i = index; i >= 0; i--) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                    insertIdx = i
                } else {
                    break
                }
            }
        }

        const newEvent: ShowEvent = { ...target, sceneId: target.sceneId + (position === 'after' ? 1 : 0), eventId: 1, type: 'Title', cue: 'New Scene' }
        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newEvent)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    insertEvent: (index, position) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]

        // Find insertion point outside the group
        let insertIdx = index
        if (position === 'after') {
            for (let i = index; i < events.length; i++) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                    insertIdx = i
                } else {
                    break
                }
            }
            insertIdx += 1
        } else {
            for (let i = index; i >= 0; i--) {
                if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                    insertIdx = i
                } else {
                    break
                }
            }
        }

        // Auto-increment eventId based on position relative to group
        // If inserting after group X.Y.Z, new group is X.Y.Z+1
        const newEvent: ShowEvent = { ...target, eventId: target.eventId + (position === 'after' ? 1 : 0), type: 'Title', cue: 'New Event' }

        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newEvent)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    renameAct: (oldName, newName) => {
        const { events, isLocked } = get()
        if (isLocked || !oldName || !newName) return

        const newEvents = events.map(e => e.act === oldName ? { ...e, act: newName } : e)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    renameScene: (actName, sceneId, newDescription) => {
        const { events, isLocked } = get()
        if (isLocked) return

        const sceneEvents = events.filter(e => e.act === actName && e.sceneId === sceneId)
        if (sceneEvents.length === 0) return

        const titleEventIndex = events.findIndex(e => e.act === actName && e.sceneId === sceneId && e.type === 'Title')

        const newEvents = [...events]
        if (titleEventIndex !== -1) {
            newEvents[titleEventIndex] = { ...newEvents[titleEventIndex], cue: newDescription }
        } else {
            // Create new Title event at start of scene
            const firstEventIndex = events.findIndex(e => e.act === actName && e.sceneId === sceneId)
            if (firstEventIndex !== -1) {
                const newEvent: ShowEvent = {
                    ...events[firstEventIndex],
                    eventId: Math.max(1, events[firstEventIndex].eventId - 1),
                    type: 'Title',
                    cue: newDescription
                }
                newEvents.splice(firstEventIndex, 0, newEvent)
            }
        }
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    moveAct: (actName, direction) => {
        const { events, isLocked } = get()
        if (isLocked) return

        const orderedActs: string[] = []
        events.forEach(e => {
            if (!orderedActs.includes(e.act)) orderedActs.push(e.act)
        })

        const actIndex = orderedActs.indexOf(actName)
        if (actIndex === -1) return
        if (direction === 'up' && actIndex === 0) return
        if (direction === 'down' && actIndex === orderedActs.length - 1) return

        const targetIndex = direction === 'up' ? actIndex - 1 : actIndex + 1

        const sourceAct = orderedActs[actIndex]
        const targetAct = orderedActs[targetIndex]
        orderedActs[actIndex] = targetAct
        orderedActs[targetIndex] = sourceAct

        const newEvents: ShowEvent[] = []
        orderedActs.forEach(act => {
            newEvents.push(...events.filter(e => e.act === act))
        })

        set({ events: newEvents })
        get().saveCurrentShow()
    },

    moveScene: (actName, sceneId, direction) => {
        const { events, isLocked } = get()
        if (isLocked) return

        const orderedScenes: number[] = []
        events.filter(e => e.act === actName).forEach(e => {
            if (!orderedScenes.includes(e.sceneId)) orderedScenes.push(e.sceneId)
        })

        const sceneIndex = orderedScenes.indexOf(sceneId)
        if (sceneIndex === -1) return
        if (direction === 'up' && sceneIndex === 0) return
        if (direction === 'down' && sceneIndex === orderedScenes.length - 1) return

        const targetIndex = direction === 'up' ? sceneIndex - 1 : sceneIndex + 1

        const actEvents = events.filter(e => e.act === actName)
        const eventsByScene: Record<number, ShowEvent[]> = {}
        orderedScenes.forEach(sid => {
            eventsByScene[sid] = actEvents.filter(e => e.sceneId === sid)
        })

        const sourceSid = orderedScenes[sceneIndex]
        const targetSid = orderedScenes[targetIndex]
        orderedScenes[sceneIndex] = targetSid
        orderedScenes[targetIndex] = sourceSid

        const newActEvents: ShowEvent[] = []
        orderedScenes.forEach(sid => {
            newActEvents.push(...eventsByScene[sid])
        })

        const firstActIndex = events.findIndex(e => e.act === actName)
        const eventsWithoutAct = events.filter(e => e.act !== actName)

        eventsWithoutAct.splice(firstActIndex, 0, ...newActEvents)

        set({ events: eventsWithoutAct })
        get().saveCurrentShow()
    },

    moveEvent: (index, direction) => {
        const { events, isLocked } = get()
        if (isLocked) return

        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === events.length - 1) return

        const targetIndex = direction === 'up' ? index - 1 : index + 1

        const newEvents = [...events]
        const movingEvent = { ...newEvents[index] }
        const targetEvent = newEvents[targetIndex]

        movingEvent.act = targetEvent.act
        movingEvent.sceneId = targetEvent.sceneId

        newEvents.splice(index, 1)
        newEvents.splice(targetIndex, 0, movingEvent)

        set({ events: newEvents })
        get().saveCurrentShow()
    },

    deleteEvent: (index) => {
        const { events, isLocked, activeEventIndex } = get()
        if (isLocked) return
        const newEvents = events.filter((_, i) => i !== index)
        let newActive = activeEventIndex
        if (activeEventIndex === index) newActive = Math.min(index, newEvents.length - 1)
        else if (activeEventIndex > index) newActive -= 1
        set({ events: newEvents, activeEventIndex: newActive })
        get().saveCurrentShow()
    },

    deleteGroup: (act, sceneId, eventId) => {
        const { events, isLocked, activeEventIndex } = get()
        if (isLocked) return
        const newEvents = events.filter(e => !(e.act === act && e.sceneId === sceneId && e.eventId === eventId))
        let newActive = activeEventIndex
        if (newActive >= newEvents.length) newActive = newEvents.length - 1
        set({ events: newEvents, activeEventIndex: newActive })
        get().saveCurrentShow()
    },

    deleteAct: (act) => {
        const { events, isLocked, activeEventIndex } = get()
        if (isLocked) return
        if (!confirm(`Weet je zeker dat je ${act} en alle scenes/events daarin wilt verwijderen?`)) return

        const newEvents = events.filter(e => e.act !== act)
        let newActive = activeEventIndex
        if (newActive >= newEvents.length) newActive = newEvents.length - 1

        set({ events: newEvents, activeEventIndex: newActive })
        get().saveCurrentShow()
    },

    deleteScene: (act, sceneId) => {
        const { events, isLocked, activeEventIndex } = get()
        if (isLocked) return
        if (!confirm(`Weet je zeker dat je Scene ${sceneId} (in ${act}) wilt verwijderen?`)) return

        const newEvents = events.filter(e => !(e.act === act && e.sceneId === sceneId))
        let newActive = activeEventIndex
        if (newActive >= newEvents.length) newActive = newEvents.length - 1

        set({ events: newEvents, activeEventIndex: newActive })
        get().saveCurrentShow()
    },

    updateEvent: (index, partial) => {
        const { isLocked } = get()
        if (isLocked) return
        set(state => ({ events: state.events.map((e, i) => i === index ? { ...e, ...partial } : e) }))
        get().saveCurrentShow()
    },

    resendEvent: async (index) => {
        const event = get().events[index]
        if (event) {
            set(state => ({ eventStatuses: { ...state.eventStatuses, [index]: 'sending' } }))
            try {
                await networkService.sendCommand({ type: 'EVENT_TRIGGER', event })
                set(state => ({ eventStatuses: { ...state.eventStatuses, [index]: 'ok' } }))
                setTimeout(() => set(state => {
                    const newStatuses = { ...state.eventStatuses }; delete newStatuses[index]
                    return { eventStatuses: newStatuses }
                }), 3000)
            } catch {
                set(state => ({ eventStatuses: { ...state.eventStatuses, [index]: 'failed' } }))
            }
        }
    },

    restartMedia: (index) => {
        const { events, activeShow } = get()
        const event = events[index]
        if (!event) return

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = activeShow?.devices || []
        const targets = devices.filter(d => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        const getMediaUrl = (path: string) => {
            if (!path) return ''
            if (path.startsWith('http') || path.startsWith('file') || path.startsWith('ledshow-file')) return path
            return `ledshow-file:///${path.replace(/\\/g, '/')}`
        }

        targets.forEach(d => {
            const mediaUrl = getMediaUrl(event.filename || '')
            const repeat = event.type === 'media' && event.effect === 'repeat'
            const volume = event.intensity !== undefined ? event.intensity : 100

            if (d.type === 'local_monitor') {
                MediaPlayer.StartMediaPlayer(d, mediaUrl, repeat, volume, 0, undefined, event.transition)
            } else {
                networkService.sendCommand({
                    type: 'MEDIA_CONTROL',
                    action: 'play',
                    payload: {
                        url: mediaUrl,
                        loop: repeat,
                        volume: volume,
                        mute: !event.sound,
                        deviceId: d.id
                    }
                })
            }
        })
    },

    stopMedia: (index) => {
        const { events, activeShow } = get()
        const event = events[index]
        if (!event) return

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = activeShow?.devices || []
        const targets = devices.filter(d => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        targets.forEach(d => {
            if (d.type === 'local_monitor') {
                MediaPlayer.StopMediaPlayer(d, 500)
            } else {
                networkService.sendCommand({
                    type: 'MEDIA_CONTROL',
                    action: 'stop',
                    payload: { deviceId: d.id }
                })
            }
        })
    },

    stopAllMedia: () => {
        const { activeShow } = get()
        const devices = activeShow?.devices || []

        devices.filter(d => d.type === 'local_monitor' && (d as any).enabled !== false).forEach(d => {
            MediaPlayer.StopMediaPlayer(d, 500)
        })

        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'stop_all'
        })
    },

    setMediaVolume: (index: number, volume: number) => {
        const { events, activeShow, updateEvent } = get()
        const event = events[index]
        if (!event) return

        updateEvent(index, { intensity: volume })

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = activeShow?.devices || []
        const targets = devices.filter(d => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        targets.forEach(d => {
            if (d.type === 'local_monitor') {
                MediaPlayer.SetVolumeMediaPlayer(d, volume)
            } else {
                networkService.sendCommand({
                    type: 'MEDIA_CONTROL',
                    action: 'volume',
                    payload: { deviceId: d.id, volume, mute: !event.sound }
                })
            }
        })
    },

    toggleAudio: async (index) => {
        const { events, activeShow, updateEvent } = get()
        const event = events[index]
        if (event) {
            const newState = !event.sound
            updateEvent(index, { sound: newState })

            const targetName = (event.fixture || '').trim().toLowerCase()
            const devices = activeShow?.devices || []
            const targets = devices.filter(d => {
                const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
                const isEnabled = (d as any).enabled !== false
                const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                return isTypeMatch && isEnabled && isNameMatch
            })

            targets.forEach(d => {
                const vol = event.intensity !== undefined ? event.intensity : 100
                if (d.type === 'local_monitor') {
                    MediaPlayer.SetVolumeMediaPlayer(d, newState ? vol : 0)
                } else {
                    networkService.sendCommand({
                        type: 'MEDIA_CONTROL',
                        action: 'volume',
                        payload: { deviceId: d.id, volume: vol, mute: !newState }
                    })
                }
            })
        }
    },

    toggleRepeat: async (index) => {
        const { events, activeShow, updateEvent } = get()
        const event = events[index]
        if (event) {
            const newState = event.effect !== 'repeat'
            updateEvent(index, { effect: newState ? 'repeat' : '' })

            const targetName = (event.fixture || '').trim().toLowerCase()
            const devices = activeShow?.devices || []
            const targets = devices.filter(d => {
                const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
                const isEnabled = (d as any).enabled !== false
                const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                return isTypeMatch && isEnabled && isNameMatch
            })

            targets.forEach(d => {
                if (d.type === 'local_monitor') {
                    MediaPlayer.SetRepeatMediaPlayer(d, newState)
                } else if (d.type === 'remote_ledwall') {
                    networkService.sendCommand({
                        type: 'MEDIA_CONTROL',
                        action: 'toggle_repeat',
                        payload: { deviceId: d.id, repeat: newState }
                    })
                }
            })
        }
    },

    startProjection: (deviceId, monitorIndex) => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            ipcRenderer.invoke('start-projection', { deviceId, monitorIndex })
        }
    },

    mediaAction: (deviceId, action, payload) => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            ipcRenderer.send('media-command', {
                deviceId,
                command: action,
                payload
            })
        }
    }
}))
