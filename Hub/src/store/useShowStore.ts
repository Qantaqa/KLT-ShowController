import { create } from 'zustand'
import type { ShowEvent, ClipboardItem } from '../services/xml-service'
import { networkService } from '../services/network-service'
import { XmlService } from '../services/xml-service'
import * as MediaPlayer from '../services/media-player-service'
import { showInitService } from '../services/show-init-service'


export type DeviceType = 'wled' | 'wiz' | 'local_monitor' | 'remote_ledwall' | 'videowall_agent'

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
    fadeInTime?: number         // In seconds
    fadeOutTime?: number        // In seconds
    transitionTime?: number     // In seconds
}

export interface LocalMonitorDevice extends BaseDevice {
    type: 'local_monitor'
    monitorId: number
    fadeOutTime?: number        // In seconds
    transitionTime?: number     // In seconds
}

export interface RemoteLedwallDevice extends BaseDevice {
    type: 'remote_ledwall'
    ip: string
    width: number
    height: number
    orientation: 'landscape' | 'portrait'
}

export interface VideoWallAgentDevice extends BaseDevice {
    type: 'videowall_agent'
    ip: string
    port: number
    model: '4-screen' | '9-screen'
    layout: string
    orientation: 'landscape' | 'portrait'
    cachedFiles?: string[]
    fadeInTime?: number         // In seconds
    fadeOutTime?: number        // In seconds
    crossoverTime?: number      // In seconds
    repeat?: boolean
    bezelSize?: number          // Gap between screens in pixels (preview only for now)
}

export type Device = WLEDDevice | WiZDevice | LocalMonitorDevice | RemoteLedwallDevice | VideoWallAgentDevice

export interface ShowProfile {
    id: string
    name: string
    pdfPath: string
    totalPages?: number          // Total number of script pages
    sidebarWidth?: number
    invertScriptColors?: boolean
    schedule?: Record<number, { time1: string; time2: string }> // 0 = Sunday, 1 = Monday, etc.
    viewState?: {
        collapsedGroups?: Record<string, boolean>
        currentScriptPage?: number
        sceneNames?: Record<string, string> // Key format: "actId-sceneId"
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
    geminiApiKey?: string
    devices: Device[]
    clientConfigs?: Record<string, {
        isCameraActive?: boolean
        isSelfPreviewVisible?: boolean
        selectedCameraClients?: string[]
        lastSeen?: number
    }>
}

interface ShowState {
    events: ShowEvent[]
    activeEventIndex: number
    selectedEventIndex: number // New state for Edit Mode selection
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
    playingMedia: Record<string, {
        filename: string;
        timestamp: number;
        stopAct?: string;
        stopSceneId?: number;
        stopEventId?: number;
    }>
    persistentLights: Record<string, {
        fixture: string;
        stopAct: string;
        stopSceneId: number;
        stopEventId: number;
    }>

    // Runtime Collapse State (for Show Mode)
    runtimeCollapsedGroups: Record<string, boolean>

    // UI State
    autoFollowScript: boolean

    // Status tracking for network events
    eventStatuses: Record<number, 'sending' | 'ok' | 'failed' | null>
    deviceAvailability: Record<string, {
        id: string;
        status: 'online' | 'offline' | 'error';
        lastSeen: number;
    }>
    connectedClients: any[] // array of { id, uuid }
    isSynced: boolean
    clipboard: ClipboardItem[]

    // Actions
    setEvents: (events: ShowEvent[]) => void
    setActiveEvent: (index: number) => void
    setSelectedEvent: (index: number) => void // New action
    setLocked: (locked: boolean) => void
    setShowStartTime: (time: string) => void
    nextEvent: (force?: boolean) => void
    nextScene: (force?: boolean) => void
    nextAct: (force?: boolean) => void
    toggleCollapse: (id: string) => void
    collapseAll: () => void
    expandAll: () => void
    updateBlinkRecommendations: (activeIndex: number) => void

    // Camera Sharing State
    isCameraActive: boolean
    isSelfPreviewVisible: boolean
    activeCameraStreams: Record<string, string> // clientId -> base64 frame
    selectedCameraClients: string[] // List of up to 2 client IDs we want to see
    dismissedWebcams: string[] // List of client IDs we manually closed
    clientUUID: string
    clientFriendlyName: string

    // Auth & Registration
    isAuthorized: boolean
    registrationStatus: 'NOT_FOUND' | 'WAITING_PIN' | 'WAITING_HOST_PIN' | 'WAITING_REGISTRATION' | 'AUTHORIZED' | 'STARTING' | null
    registrationData: {
        existingClients?: { id: string, friendlyName: string }[]
        status?: string
        selectedClientId?: string
    }
    appLocked: boolean

    // Show management
    setActiveShow: (show: ShowProfile) => void
    updateActiveShow: (partial: Partial<ShowProfile>) => Promise<void>
    updateActiveShowPdf: (path: string) => void
    updateActiveShowSidebarWidth: (width: number) => void
    createNewShow: (name: string, scriptPath?: string) => Promise<void>
    archiveShow: (id: string) => Promise<void>
    deleteProject: (id: string) => Promise<void>
    saveCurrentShow: () => Promise<void>
    initializeShows: () => Promise<void>
    updateAppSettings: (partial: Partial<AppSettingsProfile>) => Promise<void>
    importShow: (name: string, xmlContent: string, xmlPath?: string) => Promise<void>

    // Device actions
    addDevice: (device: Device) => Promise<void>
    updateDevice: (id: string, partial: Partial<Device>) => Promise<void>
    deleteDevice: (id: string) => Promise<void>

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
    addCommentToEvent: (indexInGroup: number) => void
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
    togglePause: () => void
    toggleAutoFollowScript: () => void
    setCurrentScriptPage: (page: number) => void
    syncFromRemote: (state: any) => void
    syncAppSettings: (settings: AppSettingsProfile) => void
    setDeviceAvailability: (statuses: Record<string, any>) => void
    setConnectedClients: (ids: any[]) => void
    broadcastState: () => void
    mediaAction: (deviceId: string, action: string, payload?: any) => void

    // Auth Actions
    verifyHostPin: (pin: string) => void
    completeRegistration: (name: string, pin: string) => void
    verifyClientPin: (pin: string) => void
    setAppLocked: (locked: boolean) => void

    // Camera Actions
    updateCameraFrame: (clientId: string, frame: string) => void
    clearCameraStream: (clientId: string) => void
    setCameraActive: (active: boolean) => void
    setSelfPreviewVisible: (visible: boolean) => void
    toggleCameraSelection: (clientId: string) => void
    dismissCameraStream: (clientId: string) => void

    // Toast Messages
    toasts: { id: string, type: 'info' | 'warning' | 'error', message: string }[]
    addToast: (message: string, type?: 'info' | 'warning' | 'error') => void
    removeToast: (id: string) => void

    // Modal State
    modalConfig: {
        isOpen: boolean
        title: string
        message: string
        type: 'confirm' | 'prompt'
        defaultValue?: string
        showCheckbox?: boolean
        checkboxLabel?: string
        onConfirm: (val?: string, checked?: boolean) => void
        onCancel?: () => void
        onClose?: () => void
        confirmLabel?: string
        cancelLabel?: string
    }
    openModal: (config: {
        title: string
        message: string
        type: 'confirm' | 'prompt'
        defaultValue?: string
        onConfirm: (value?: string, checked?: boolean) => void
        onCancel?: () => void
        confirmLabel?: string
        cancelLabel?: string
    }) => void
    closeModal: () => void

    // Clipboard Actions
    copyToClipboard: (event: ShowEvent) => Promise<void>
    loadClipboard: () => Promise<void>

    removeFromClipboard: (id: number) => Promise<void>
    clearClipboard: () => Promise<void>
    pasteEvent: (index: number, partialData: Partial<ShowEvent>) => void
    reindexEvents: () => void
}

const DEFAULT_SHOWS: ShowProfile[] = []

export const useShowStore = create<ShowState>((set, get) => ({
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
    activeShow: null,
    availableShows: DEFAULT_SHOWS,
    eventStatuses: {},
    connectedClients: [],
    isSynced: false,
    clientUUID: (() => {
        const key = 'ledshow_client_uuid'
        let id = localStorage.getItem(key)
        if (!id) {
            id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
            localStorage.setItem(key, id)
        }
        return id
    })(),
    clientFriendlyName: '',
    isAuthorized: !!(window as any).require, // Host is always authorized
    registrationStatus: !!(window as any).require ? 'AUTHORIZED' : 'STARTING',
    registrationData: {},
    appLocked: false,
    clipboard: [],

    appSettings: {
        defaultLogo: '',
        accessPin: '',
        serverPort: 3001,
        serverIp: 'localhost',
        devices: []
    },

    isCameraActive: false,
    isSelfPreviewVisible: true,
    activeCameraStreams: {},
    selectedCameraClients: [],
    dismissedWebcams: [],

    showStartTime: "19:30",
    actualStartTime: null,
    isPaused: false,
    pauseStartTime: null,
    lastTransitionTime: null,
    playingMedia: {},
    persistentLights: {},
    deviceAvailability: {},

    runtimeCollapsedGroups: {},

    modalConfig: {
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: () => { },
        onCancel: () => { }
    },

    setEvents: (events) => set({ events }),
    setLocked: async (isLocked) => {
        const { activeShow, events } = get()
        set({ isLocked })
        get().broadcastState()

        if (isLocked) {
            // Unlocked -> Locked (Show Mode)
            // Save current show first
            await get().saveCurrentShow()

            // Default Show Mode View: Collapse All except Next (Act 1, Scene 1)
            // Or if there is an active event, focus on that.
            // Requirement: "klap dan alles in behalve act 1- scene 1 en event 1" (if mostly starting fresh)
            // We'll use the activeEventIndex to determine what to show, defaulting to index 0 if -1.

            const targetIndex = get().activeEventIndex >= 0 ? get().activeEventIndex : 0
            if (events && events.length > 0) {
                const target = events[targetIndex]
                const actKey = `act-${target.act}`
                const sceneKey = `scene-${target.act}-${target.sceneId}`

                // Collapse ALL acts and scenes initially
                const newRuntimeCollapsed: Record<string, boolean> = {}
                const acts = new Set(events.map(e => e.act))
                acts.forEach(a => newRuntimeCollapsed[`act-${a}`] = true)

                const scenes = new Set(events.map(e => `scene-${e.act}-${e.sceneId}`))
                scenes.forEach(s => newRuntimeCollapsed[s] = true)

                // Expand target
                newRuntimeCollapsed[actKey] = false
                newRuntimeCollapsed[sceneKey] = false

                set({ runtimeCollapsedGroups: newRuntimeCollapsed })
            }
        } else {
            // Locked -> Unlocked (Edit Mode)
            // Restore persistent view state from DB (activeShow.viewState)
            // The SequenceGrid will defer to activeShow.viewState.collapsedGroups when !isLocked
            // But we can also sync runtimeCollapsedGroups just in case we need it
            if (activeShow?.viewState?.collapsedGroups) {
                set({ runtimeCollapsedGroups: { ...activeShow.viewState.collapsedGroups } })
            }
        }
    },
    collapseAll: () => {
        const { events, activeShow, isLocked } = get()
        const newCollapsed: Record<string, boolean> = {}
        events.forEach(e => {
            // Acts and Scenes stay open (false), but Event groups (uniqueId) collapse (true)
            newCollapsed[`act-${e.act}`] = false
            newCollapsed[`scene-${e.act}-${e.sceneId}`] = false
            newCollapsed[`${e.act}-${e.sceneId}-${e.eventId}`] = true
        })

        if (isLocked) {
            set({ runtimeCollapsedGroups: newCollapsed })
        } else if (activeShow) {
            set({ runtimeCollapsedGroups: newCollapsed })
            get().updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: newCollapsed } })
        }
    },
    expandAll: () => {
        const { activeShow, isLocked } = get()
        if (isLocked) {
            set({ runtimeCollapsedGroups: {} })
        } else if (activeShow) {
            set({ runtimeCollapsedGroups: {} })
            get().updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: {} } })
        }
    },
    toggleTimeTracking: () => set(state => ({ isTimeTracking: !state.isTimeTracking })),
    togglePause: () => {
        const { isPaused, pauseStartTime, lastTransitionTime } = get()
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
        get().broadcastState()
    },
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
            lastTransitionTime: state.lastTransitionTime,
            runtimeCollapsedGroups: state.runtimeCollapsedGroups || {},
            isSynced: true
        })

        // On remote, we don't overwrite selectedCameraClients if they are already set locally?
        // Actually, the user wants per-client settings.
    },

    syncAppSettings: (appSettings) => {
        set({ appSettings })
    },

    setDeviceAvailability: (statuses: Record<string, any>) => {
        // console.log('--- STORE: updating device availability ---', Object.keys(statuses).length, 'devices');
        set({ deviceAvailability: statuses });
    },

    setConnectedClients: (ids) => set({ connectedClients: ids }),

    setCameraActive: (active) => {
        const { clientUUID, appSettings, updateAppSettings } = get()
        set({ isCameraActive: active })

        // Persist to database
        const configs = { ...(appSettings.clientConfigs || {}) }
        configs[clientUUID] = {
            ...(configs[clientUUID] || {}),
            isCameraActive: active,
            lastSeen: Date.now()
        }
        updateAppSettings({ clientConfigs: configs })
    },
    updateCameraFrame: (clientId, frame) => set(state => ({
        activeCameraStreams: { ...state.activeCameraStreams, [clientId]: frame }
    })),
    clearCameraStream: (clientId) => set(state => {
        const streams = { ...state.activeCameraStreams }
        delete streams[clientId]
        return { activeCameraStreams: streams }
    }),
    toggleCameraSelection: (clientId) => {
        const { selectedCameraClients, clientUUID, appSettings, updateAppSettings } = get()
        let selected = [...selectedCameraClients]
        if (selected.includes(clientId)) {
            selected = selected.filter(id => id !== clientId)
        } else {
            if (selected.length >= 2) selected.shift()
            selected.push(clientId)
        }
        set({ selectedCameraClients: selected })

        // Persist to database
        const configs = { ...(appSettings.clientConfigs || {}) }
        configs[clientUUID] = {
            ...(configs[clientUUID] || {}),
            selectedCameraClients: selected,
            lastSeen: Date.now()
        }
        updateAppSettings({ clientConfigs: configs })
    },
    dismissCameraStream: (clientId) => set(state => ({
        dismissedWebcams: [...state.dismissedWebcams, clientId],
        selectedCameraClients: state.selectedCameraClients.filter(id => id !== clientId)
    })),
    setSelfPreviewVisible: (visible) => {
        const { clientUUID, appSettings, updateAppSettings } = get()
        set({ isSelfPreviewVisible: visible })

        // Persist to database
        const configs = { ...(appSettings.clientConfigs || {}) }
        configs[clientUUID] = {
            ...(configs[clientUUID] || {}),
            isSelfPreviewVisible: visible,
            lastSeen: Date.now()
        }
        updateAppSettings({ clientConfigs: configs })
    },

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
                state: {
                    activeShow,
                    events,
                    activeEventIndex,
                    isLocked,
                    appSettings: remoteAppSettings,
                    blinkingNextEvent,
                    blinkingNextScene,
                    blinkingNextAct,
                    navigationWarning,
                    lastTransitionTime,
                    runtimeCollapsedGroups: get().runtimeCollapsedGroups
                }
            })
        }
    },

    setSelectedEvent: (index) => set({ selectedEventIndex: index }),

    setAppLocked: (locked) => {
        set({ appLocked: locked })
        networkService.sendCommand({ type: 'SET_LOCKED', locked })
    },

    verifyHostPin: (pin) => {
        networkService.sendCommand({ type: 'VERIFY_HOST_PIN', pin })
    },

    completeRegistration: (name, pin) => {
        networkService.sendCommand({ type: 'COMPLETE_REGISTRATION', friendlyName: name, pinCode: pin })
    },

    verifyClientPin: (pin) => {
        networkService.sendCommand({ type: 'VERIFY_CLIENT_PIN', pin })
    },

    setActiveEvent: (index) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'setActiveEvent', index })
            return
        }

        const { events, activeEventIndex, actualStartTime, isPaused, isTimeTracking, lastTransitionTime, isLocked } = get()

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

        // ---------------------------------------------------------
        // AUTO-COLLAPSE LOGIC (Show Mode Only)
        // ---------------------------------------------------------
        if (isLocked) {
            // Identify Next Group (Event, Scene, or Act)
            // We want to keep Current and Next expanded.
            // Simplest approach: Collapse All, then Expand Current & Next.

            // 1. Build list of all Group Keys
            const allGroupKeys = new Set<string>()
            newEvents.forEach(e => {
                allGroupKeys.add(`act-${e.act}`)
                allGroupKeys.add(`scene-${e.act}-${e.sceneId}`)
            })

            const nextRuntimeCollapsed: Record<string, boolean> = {}
            // Set all to true
            allGroupKeys.forEach(k => nextRuntimeCollapsed[k] = true)

            // 2. Expand Current
            nextRuntimeCollapsed[`act-${currentEvent.act}`] = false
            nextRuntimeCollapsed[`scene-${currentEvent.act}-${currentEvent.sceneId}`] = false

            // 3. Find Next Context (Next Event, Scene, or Act)
            // We look forward for the first row that belongs to a different event group
            let nextGroupIdx = -1;
            for (let i = index + 1; i < newEvents.length; i++) {
                const e = newEvents[i];
                if (e.act !== currentEvent.act || e.sceneId !== currentEvent.sceneId || e.eventId !== currentEvent.eventId) {
                    nextGroupIdx = i;
                    break;
                }
            }

            if (nextGroupIdx !== -1) {
                const nextE = newEvents[nextGroupIdx];
                nextRuntimeCollapsed[`act-${nextE.act}`] = false;
                nextRuntimeCollapsed[`scene-${nextE.act}-${nextE.sceneId}`] = false;
            }

            updates.runtimeCollapsedGroups = nextRuntimeCollapsed;
        }
        // ---------------------------------------------------------

        set(updates)

        // ---------------------------------------------------------
        // SCRIPT FOLLOW LOGIC
        // ---------------------------------------------------------
        if (isLocked && get().autoFollowScript) {
            // Check current row first, then fallback to group title
            let pageToJump = currentEvent.scriptPg

            if (!pageToJump || pageToJump <= 0) {
                // Find group title row (search backward from current index)
                for (let i = index; i >= 0; i--) {
                    const row = newEvents[i]
                    if (row.act === currentEvent.act &&
                        row.sceneId === currentEvent.sceneId &&
                        row.eventId === currentEvent.eventId) {

                        if (row.scriptPg && row.scriptPg > 0) {
                            pageToJump = row.scriptPg
                            break
                        }
                    } else {
                        // We left the group, stop searching
                        break
                    }
                }
            }

            if (pageToJump && pageToJump > 0) {
                get().setCurrentScriptPage(pageToJump)
            }
        }
        // ---------------------------------------------------------

        // ---------------------------------------------------------
        // PERSISTENCE & TRIGGER LOGIC
        // ---------------------------------------------------------
        const activeGroupEvents = newEvents.filter(e =>
            e.act === currentEvent.act &&
            e.sceneId === currentEvent.sceneId &&
            e.eventId === currentEvent.eventId
        )
        const { appSettings, playingMedia, persistentLights } = get()
        const devices = appSettings.devices || []
        const nextPlayingMedia: Record<string, any> = { ...playingMedia }
        const nextPersistentLights: Record<string, any> = { ...persistentLights }
        const targetedDeviceIds = new Set<string>()
        const targetedLightFixtures = new Set<string>()

        // Helper to check if event A is at or after event B
        const isAtOrAfter = (actA: string, sIdA: number, eIdA: number, actB: string, sIdB: number, eIdB: number) => {
            if (actA !== actB) {
                // Assuming Act 1, Act 2 etc. or simple string comparison if not following that pattern
                return actA.localeCompare(actB, undefined, { numeric: true }) >= 0
            }
            if (sIdA !== sIdB) return sIdA >= sIdB
            return eIdA >= eIdB
        }

        // 1. Process New Media Triggers
        activeGroupEvents.forEach((evt: ShowEvent) => {
            if (evt.type?.toLowerCase() === 'media' && evt.filename) {
                const targetName = (evt.fixture || '').trim().toLowerCase()

                const targets = devices.filter(d => {
                    const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
                    const isEnabled = (d as any).enabled !== false
                    const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                    return isTypeMatch && isEnabled && isNameMatch
                })

                targets.forEach(device => {
                    // Check availability for local monitors
                    if (device.type === 'local_monitor') {
                        const statusRecord = get().deviceAvailability[device.id]
                        if (statusRecord && statusRecord.status !== 'online') {
                            const monitorName = device.name || `Monitor ${device.monitorId}`
                            get().addToast(`Afspelen mislukt: ${monitorName} is niet aangesloten`, 'error')
                            return // Skip this device
                        }
                    }

                    targetedDeviceIds.add(device.id)
                    const mediaUrl = evt.filename || ''
                    const repeat = evt.effect === 'repeat'
                    const volume = evt.intensity !== undefined ? evt.intensity : 100
                    const isLocal = device.type === 'local_monitor'
                    const dLocal = isLocal ? device as LocalMonitorDevice : null

                    const deviceTransition = (dLocal?.transitionTime || 0) * 1000
                    const transitionTime = evt.transition || deviceTransition || 0

                    if (isLocal) {
                        const alreadyPlaying = playingMedia[device.id]
                        if (alreadyPlaying && alreadyPlaying.filename === evt.filename) {
                            MediaPlayer.SetRepeatMediaPlayer(device, repeat)
                            MediaPlayer.SetVolumeMediaPlayer(device, volume, !evt.sound)
                        } else if (alreadyPlaying) {
                            MediaPlayer.ChangeMediaPlayer(device, mediaUrl, transitionTime, repeat, volume, !evt.sound)
                        } else {
                            MediaPlayer.StartMediaPlayer(device, mediaUrl, repeat, volume, 0, undefined, transitionTime, !evt.sound)
                        }
                    } else if (device.type === 'remote_ledwall') {
                        MediaPlayer.StartMediaPlayer(device, mediaUrl, repeat, volume, 0, undefined, transitionTime, !evt.sound)
                    }

                    nextPlayingMedia[device.id] = {
                        filename: evt.filename || '',
                        timestamp: Date.now(),
                        stopAct: evt.stopAct,
                        stopSceneId: evt.stopSceneId,
                        stopEventId: evt.stopEventId
                    }
                })
            }
        })

        // 2. Process New Light Triggers
        activeGroupEvents.forEach((evt: ShowEvent) => {
            if (evt.type?.toLowerCase() === 'light') {
                targetedLightFixtures.add(evt.fixture)
                if (evt.stopAct && evt.stopSceneId && evt.stopEventId) {
                    nextPersistentLights[evt.fixture] = {
                        fixture: evt.fixture,
                        stopAct: evt.stopAct,
                        stopSceneId: evt.stopSceneId,
                        stopEventId: evt.stopEventId
                    }
                } else {
                    delete nextPersistentLights[evt.fixture]
                }

                networkService.sendCommand({
                    type: 'EVENT_TRIGGER',
                    event: evt
                })
            }
        })

        // 3. Stop logic for Media
        Object.keys(playingMedia).forEach(deviceId => {
            const currentInfo = playingMedia[deviceId]
            const isTargetedNow = targetedDeviceIds.has(deviceId)

            let shouldStop = false
            if (!isTargetedNow) {
                // If not targeted, check if we reached the stop event
                if (currentInfo.stopAct !== undefined && currentInfo.stopSceneId !== undefined && currentInfo.stopEventId !== undefined) {
                    if (isAtOrAfter(currentEvent.act, currentEvent.sceneId, currentEvent.eventId, currentInfo.stopAct, currentInfo.stopSceneId, currentInfo.stopEventId)) {
                        shouldStop = true
                    }
                } else {
                    // Default behavior: stop when next event group starts
                    shouldStop = true
                }
            }

            if (shouldStop) {
                const device = devices.find(d => d.id === deviceId)
                if (device) {
                    const dLocal = device.type === 'local_monitor' ? device as LocalMonitorDevice : null
                    const fadeOutTime = (dLocal?.fadeOutTime || 0.5) * 1000
                    MediaPlayer.StopMediaPlayer(device, fadeOutTime)
                    delete nextPlayingMedia[deviceId]
                }
            }
        })

        // 4. Stop logic for Persistent Lights
        Object.keys(persistentLights).forEach(fixture => {
            const info = persistentLights[fixture]
            const isTargetedNow = targetedLightFixtures.has(fixture)

            if (!isTargetedNow) {
                if (isAtOrAfter(currentEvent.act, currentEvent.sceneId, currentEvent.eventId, info.stopAct, info.stopSceneId, info.stopEventId)) {
                    // Send stop command (brightness 0)
                    networkService.sendCommand({
                        type: 'EVENT_TRIGGER',
                        event: {
                            act: currentEvent.act,
                            sceneId: currentEvent.sceneId,
                            eventId: currentEvent.eventId,
                            fixture: fixture,
                            type: 'light',
                            brightness: 0,
                            transition: 500 // 0.5s default fade
                        } as ShowEvent
                    })
                    delete nextPersistentLights[fixture]
                }
            }
        })
        // ---------------------------------------------------------

        set({ playingMedia: nextPlayingMedia, persistentLights: nextPersistentLights })
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
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'nextEvent', force })
            return
        }

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
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'nextScene', force })
            return
        }

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
        const isHost = !!(window as any).require
        if (!isHost) {
            networkService.sendCommand({ type: 'REMOTE_CONTROL', action: 'nextAct', force })
            return
        }

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

            set({ events, activeShow: show, isLocked: true }) // Default to Locked (Show Mode) when loading
            get().broadcastState()
            localStorage.setItem('ledshow_last_show_id', show.id)
        }
    },

    updateActiveShow: async (partial) => {
        const { activeShow, availableShows } = get()
        if (activeShow) {
            const updated = { ...activeShow, ...partial }
            const newAvailable = availableShows.map(s => s.id === activeShow.id ? updated : s)
            set({
                activeShow: updated,
                availableShows: newAvailable
            })
            await get().saveCurrentShow()
        }
    },

    updateActiveShowPdf: (path) => get().updateActiveShow({ pdfPath: path }),
    updateActiveShowSidebarWidth: (width) => get().updateActiveShow({ sidebarWidth: width }),

    toggleCollapse: (id) => {
        const { activeShow, isLocked, runtimeCollapsedGroups } = get()

        if (isLocked) {
            // Show Mode: Update runtime state only (not saved)
            set({ runtimeCollapsedGroups: { ...runtimeCollapsedGroups, [id]: !runtimeCollapsedGroups[id] } })
        } else {
            // Edit Mode: Update persistent state AND save
            if (activeShow) {
                const currentGroups = activeShow.viewState?.collapsedGroups || {}
                const newGroups = { ...currentGroups, [id]: !currentGroups[id] }

                // Also update runtime to keep UI responsive/synced if it uses that
                set({ runtimeCollapsedGroups: { ...runtimeCollapsedGroups, [id]: !runtimeCollapsedGroups[id] } })

                get().updateActiveShow({ viewState: { ...activeShow.viewState, collapsedGroups: newGroups } })
            }
        }
    },

    createNewShow: async (name, scriptPath) => {
        const { addToast } = get()
        const trimmedName = (name || '').trim()
        if (!trimmedName) {
            console.error('--- STORE: createNewShow REJECTED - empty name ---')
            throw new Error('Show naam mag niet leeg zijn')
        }
        console.log('--- STORE: createNewShow ---', trimmedName, scriptPath)
        const newId = `show_${Date.now()}`
        const newShow: ShowProfile = {
            id: newId,
            name: trimmedName,
            pdfPath: scriptPath || '',
            sidebarWidth: 500,
            invertScriptColors: false,
            schedule: {},
            devices: []
        }

        const initialEvents = await showInitService.initializeShowEvents(scriptPath)

        try {
            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron')
                console.log('--- STORE: invoking db:create-show ---')
                await ipcRenderer.invoke('db:create-show', newShow)
                console.log('--- STORE: invoking db:save-sequences ---')
                await ipcRenderer.invoke('db:save-sequences', { showId: newId, events: initialEvents })
            }

            set(state => ({
                availableShows: [...state.availableShows, newShow],
                activeShow: newShow,
                events: initialEvents,
                activeEventIndex: -1,
                isLocked: false
            }))
            localStorage.setItem('ledshow_last_show_id', newId)
        } catch (error: any) {
            console.error('Failed to create new show:', error)
            addToast(`Fout bij aanmaken show: ${error.message || 'Onbekende fout'}`, 'error')
            throw error
        }
    },

    archiveShow: async (id: string) => {
        const { availableShows, activeShow, addToast } = get()
        try {
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
            addToast('Show gearchiveerd', 'info')
        } catch (error: any) {
            console.error('Failed to archive show:', error)
            addToast(`Fout bij archiveren show: ${error.message || 'Onbekende fout'}`, 'error')
        }
    },

    deleteProject: async (id: string) => {
        const { availableShows, activeShow, addToast } = get()
        try {
            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron')
                await ipcRenderer.invoke('db:delete-show', id)
            }
            const newAvailable = availableShows.filter(s => s.id !== id)
            if (activeShow?.id === id) {
                set({ availableShows: newAvailable, activeShow: null, events: [] })
                localStorage.removeItem('ledshow_last_show_id')
            } else {
                set({ availableShows: newAvailable })
            }
            addToast('Project definitief verwijderd', 'info')
        } catch (error: any) {
            console.error('Failed to delete project:', error)
            addToast(`Fout bij verwijderen project: ${error.message || 'Onbekende fout'}`, 'error')
        }
    },

    saveCurrentShow: async () => {
        const { activeShow, events, addToast } = get()
        if (activeShow && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:update-show', {
                    id: activeShow.id,
                    partial: {
                        name: activeShow.name,
                        pdfPath: activeShow.pdfPath,
                        totalPages: activeShow.totalPages || 0,
                        sidebarWidth: activeShow.sidebarWidth,
                        invertScriptColors: activeShow.invertScriptColors ? 1 : 0,
                        schedule: JSON.stringify(activeShow.schedule || {}),
                        viewState: JSON.stringify(activeShow.viewState || {})
                    }
                })
                await ipcRenderer.invoke('db:save-sequences', { showId: activeShow.id, events })
            } catch (error: any) {
                console.error('Failed to save show:', error)
                addToast(`Fout bij opslaan show naar database: ${error.message || 'Onbekende fout'}`, 'error')
                throw error
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
            const globalDevices = await ipcRenderer.invoke('db:get-devices', 'GLOBAL')

            set({
                availableShows: available,
                activeShow: null,
                events: [],
                activeEventIndex: -1,
                appSettings: { ...appSettings, devices: globalDevices || [] }
            })

            networkService.registerClient()
            if (active) {
                console.log('--- STORE: loading data for active show ---')
                await get().setActiveShow(active)
            }
            // --- Restore Client Settings ---
            let uuid = localStorage.getItem('ledshow_client_uuid')
            if (!uuid) {
                uuid = 'client_' + Math.random().toString(36).substring(2, 15)
                localStorage.setItem('ledshow_client_uuid', uuid)
            }

            const clientConfig = appSettings?.clientConfigs?.[uuid]
            if (clientConfig) {
                set({
                    clientUUID: uuid,
                    isCameraActive: clientConfig.isCameraActive ?? false,
                    isSelfPreviewVisible: clientConfig.isSelfPreviewVisible ?? true,
                    selectedCameraClients: clientConfig.selectedCameraClients ?? []
                })
            } else {
                set({ clientUUID: uuid })
            }

            console.log('--- STORE: initializeShows DONE ---')
        } catch (err) {
            console.error('--- STORE: initializeShows FAILED ---', err)
        }
    },

    updateAppSettings: async (partial) => {
        const { appSettings, addToast } = get()
        const newSettings = { ...appSettings, ...partial }
        set({ appSettings: newSettings })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                console.log('--- STORE: updateAppSettings (IPC partial) ---', partial);
                await ipcRenderer.invoke('db:update-app-settings', partial)
            } catch (error: any) {
                console.error('Failed to update app settings:', error)
                addToast(`Fout bij bijwerken instellingen: ${error.message || 'Onbekende fout'}`, 'error')
                throw error
            }
        }
    },

    importShow: async (name: string, xmlContent: string, xmlPath?: string) => {
        const { addToast } = get()
        const xmlService = new XmlService()
        const importedEvents = xmlService.parseShow(xmlContent, xmlPath)

        let trimmedName = (name || '').trim()
        if (!trimmedName && xmlPath) {
            trimmedName = xmlPath.split(/[\\/]/).pop()?.replace(/\.xml$/i, '') || 'Imported Show'
        }

        if (!trimmedName) {
            const err = new Error('Show naam mag niet leeg zijn')
            addToast(err.message, 'error')
            throw err
        }

        const newId = `show_${Date.now()}`
        const newShow: ShowProfile = { id: newId, name: trimmedName, pdfPath: '', sidebarWidth: 500, invertScriptColors: false, schedule: {}, devices: [] }

        try {
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
        } catch (error: any) {
            console.error('Failed to import show:', error)
            addToast(`Fout bij importeren show: ${error.message || 'Onbekende fout'}`, 'error')
            throw error
        }
    },

    addDevice: async (device) => {
        const { appSettings, addToast } = get()
        const devices = [...(appSettings.devices || []), device]
        set({ appSettings: { ...appSettings, devices } })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices })
            } catch (error: any) {
                console.error('Failed to add device:', error)
                addToast(`Fout bij toevoegen apparaat: ${error.message || 'Onbekende fout'}`, 'error')
            }
        }
        get().broadcastState()
    },

    updateDevice: async (id, partial) => {
        const { appSettings, addToast } = get()
        const devices = (appSettings.devices || []).map(d =>
            d.id === id ? { ...d, ...partial } as Device : d
        )
        set({ appSettings: { ...appSettings, devices } })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices })
            } catch (error: any) {
                console.error('Failed to update device:', error)
                addToast(`Fout bij bijwerken apparaat: ${error.message || 'Onbekende fout'}`, 'error')
            }
        }
        get().broadcastState()
    },

    deleteDevice: async (id) => {
        const { appSettings, addToast } = get()
        const devices = (appSettings.devices || []).filter(d => d.id !== id)
        set({ appSettings: { ...appSettings, devices } })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices })
            } catch (error: any) {
                console.error('Failed to delete device:', error)
                addToast(`Fout bij verwijderen apparaat: ${error.message || 'Onbekende fout'}`, 'error')
            }
        }
        get().broadcastState()
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


    reindexEvents: () => {
        const { events } = get()
        if (events.length === 0) return

        let currentAct = ''
        let currentSceneId = -1
        let currentEventId = -1
        let sceneCounter = 0
        let eventCounter = 0

        const newEvents = events.map((e) => {
            if (e.act !== currentAct) {
                currentAct = e.act
                sceneCounter = 0
                currentSceneId = -1
            }

            if (e.sceneId !== currentSceneId) {
                currentSceneId = e.sceneId
                sceneCounter++
                eventCounter = 0
                currentEventId = -1
            }

            if (e.eventId !== currentEventId) {
                currentEventId = e.eventId
                eventCounter++
            }

            return {
                ...e,
                sceneId: sceneCounter,
                eventId: eventCounter
            }
        })

        set({ events: newEvents })
    },

    insertAct: (index, position) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]

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

        const newActNum = parseInt(target.act.replace('Act ', '')) + (position === 'after' ? 1 : 0)
        const newEvent: ShowEvent = {
            act: `Act ${newActNum}`, sceneId: 1, eventId: 1, type: 'Title', cue: 'New Act',
            fixture: '', effect: '', palette: '', color1: '', color2: '', color3: '',
            brightness: 255, speed: 127, intensity: 100, transition: 0, sound: false
        }

        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newEvent)
        set({ events: newEvents })
        get().reindexEvents()
        get().saveCurrentShow()
    },

    insertScene: (index, position) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]

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

        const newTitle: ShowEvent = { ...target, sceneId: target.sceneId + (position === 'after' ? 1 : 0), eventId: 1, type: 'Title', cue: 'Nieuwe Scene' }
        const newTrigger: ShowEvent = { ...newTitle, type: 'Trigger', cue: 'Handmatige overgang', effect: 'manual' }
        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newTitle, newTrigger)
        set({ events: newEvents })
        get().reindexEvents()
        get().saveCurrentShow()
    },

    insertEvent: (index, position) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]

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

        const newTitle: ShowEvent = { ...target, eventId: target.eventId + (position === 'after' ? 1 : 0), type: 'Title', cue: 'Nieuw Event' }
        const newTrigger: ShowEvent = { ...newTitle, type: 'Trigger', cue: 'Handmatige overgang', effect: 'manual' }
        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newTitle, newTrigger)
        set({ events: newEvents })
        get().reindexEvents()
        get().saveCurrentShow()
    },

    renameAct: (oldName, newName) => {
        const { events, isLocked } = get()
        if (isLocked || !oldName || !newName) return

        const newEvents = events.map(e => e.act === oldName ? { ...e, act: newName } : e)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    renameScene: (actId, sceneId, newDescription) => {
        const { activeShow, isLocked } = get()
        if (isLocked || !activeShow) return

        const viewState = activeShow.viewState || {}
        const sceneNames = viewState.sceneNames || {}

        const nextSceneNames = {
            ...sceneNames,
            [`${actId}-${sceneId}`]: newDescription
        }

        const nextViewState = {
            ...viewState,
            sceneNames: nextSceneNames
        }

        set({
            activeShow: {
                ...activeShow,
                viewState: nextViewState
            }
        })
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
        get().reindexEvents()
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
        get().reindexEvents()
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
        get().reindexEvents()
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
        get().reindexEvents()
        get().saveCurrentShow()
    },

    deleteGroup: (act, sceneId, eventId) => {
        const { events, addToast } = get()

        const actEvents = events.filter(e => e.act === act)
        const uniqueEvents = new Set(actEvents.map(e => `${e.sceneId}.${e.eventId}`))

        if (uniqueEvents.size <= 1) {
            addToast('Kan het laatste event van een act niet verwijderen.', 'warning')
            return
        }

        const newEvents = events.filter(e => !(e.act === act && e.sceneId === sceneId && e.eventId === eventId))
        set({ events: newEvents })
        get().reindexEvents()
        get().saveCurrentShow()
    },

    deleteAct: (act) => {
        const { events, addToast } = get()

        const acts = new Set(events.map(e => e.act))
        if (acts.size <= 1) {
            addToast('Kan de laatste act niet verwijderen.', 'warning')
            return
        }

        const newEvents = events.filter(e => e.act !== act)
        set({ events: newEvents })
        get().reindexEvents()
        get().saveCurrentShow()
    },

    deleteScene: (act, sceneId) => {
        const { events } = get()
        const newEvents = events.filter(e => !(e.act === act && e.sceneId === sceneId))
        set({ events: newEvents })
        get().reindexEvents()
        get().saveCurrentShow()
    },

    addCommentToEvent: (index) => {
        const { events, addToast } = get()
        const target = events[index]
        if (!target) return

        // Check if group already has a comment
        const groupEvents = events.filter(e => e.act === target.act && e.sceneId === target.sceneId && e.eventId === target.eventId)
        if (groupEvents.some(e => e.type === 'Comment')) {
            addToast('Dit event heeft al een commentaarregel.', 'warning')
            return
        }

        const newComment: ShowEvent = {
            ...target,
            type: 'Comment',
            cue: 'Nieuw commentaar',
            fixture: '',
            effect: '',
            palette: '',
            color1: '',
            color2: '',
            color3: '',
            brightness: 255,
            speed: 127,
            intensity: 100,
            transition: 0,
            sound: false
        }

        const newEvents = [...events]
        // Insert after the current row (or at a specific priority if we want to follow sorting)
        newEvents.splice(index + 1, 0, newComment)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    updateEvent: (index, partial) => {
        const { events } = get()
        const newEvents = [...events]
        newEvents[index] = { ...newEvents[index], ...partial }
        set({ events: newEvents })
        // saveCurrentShow is debounced usually or we call it explicitly
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
        const { events, appSettings } = get()
        const event = events[index]
        if (!event) return

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter(d => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        const newPlaying = { ...get().playingMedia }
        targets.forEach(d => {
            const mediaUrl = event.filename || ''
            const repeat = event.type === 'media' && event.effect === 'repeat'
            const volume = event.intensity !== undefined ? event.intensity : 100
            const mute = !event.sound

            MediaPlayer.StartMediaPlayer(d, mediaUrl, repeat, volume, 0, undefined, event.transition, mute)
            newPlaying[d.id] = { filename: event.filename || '', timestamp: Date.now() }
        })
        set({ playingMedia: newPlaying })
    },

    stopMedia: (index) => {
        const { events, appSettings } = get()
        const event = events[index]
        if (!event) return

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter(d => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        const newPlaying = { ...get().playingMedia }
        targets.forEach(d => {
            const dLocal = d.type === 'local_monitor' ? d as LocalMonitorDevice : null
            const fadeOutTime = (dLocal?.fadeOutTime || 0.5) * 1000
            MediaPlayer.StopMediaPlayer(d, fadeOutTime)
            delete newPlaying[d.id]
        })
        set({ playingMedia: newPlaying })
    },

    stopAllMedia: () => {
        const { appSettings } = get()
        const devices = appSettings.devices || []

        devices.filter(d => (d.type === 'local_monitor' || d.type === 'remote_ledwall') && (d as any).enabled !== false).forEach(d => {
            MediaPlayer.StopMediaPlayer(d, 500)
        })

        set({ playingMedia: {} })
    },

    setMediaVolume: (index: number, volume: number) => {
        const { events, appSettings, updateEvent } = get()
        const event = events[index]
        if (!event) return

        updateEvent(index, { intensity: volume })

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter(d => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        targets.forEach(d => {
            MediaPlayer.SetVolumeMediaPlayer(d, volume, !event.sound)
        })
    },

    toggleAudio: async (index) => {
        const { events, appSettings, updateEvent } = get()
        const event = events[index]
        if (event) {
            const newState = !event.sound
            updateEvent(index, { sound: newState })

            const targetName = (event.fixture || '').trim().toLowerCase()
            const devices = appSettings.devices || []
            const targets = devices.filter(d => {
                const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
                const isEnabled = (d as any).enabled !== false
                const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                return isTypeMatch && isEnabled && isNameMatch
            })

            targets.forEach(d => {
                const vol = event.intensity !== undefined ? event.intensity : 100
                MediaPlayer.SetVolumeMediaPlayer(d, vol, !newState)
            })
        }
    },

    toggleRepeat: async (index) => {
        const { events, appSettings, updateEvent } = get()
        const event = events[index]
        if (event) {
            const newState = event.effect !== 'repeat'
            updateEvent(index, { effect: newState ? 'repeat' : '' })

            const targetName = (event.fixture || '').trim().toLowerCase()
            const devices = appSettings.devices || []
            const targets = devices.filter(d => {
                const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_ledwall'
                const isEnabled = (d as any).enabled !== false
                const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                return isTypeMatch && isEnabled && isNameMatch
            })

            targets.forEach(d => {
                MediaPlayer.SetRepeatMediaPlayer(d, newState)
            })
        }
    },

    copyToClipboard: async (event: ShowEvent) => {
        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')
        await ipcRenderer.invoke('db:add-to-clipboard', { type: event.type, data: event })
        await get().loadClipboard()
    },

    loadClipboard: async () => {
        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')
        const items = await ipcRenderer.invoke('db:get-clipboard')
        set({ clipboard: items })
    },

    removeFromClipboard: async (id: number) => {
        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')
        await ipcRenderer.invoke('db:remove-from-clipboard', id)
        await get().loadClipboard()
    },

    clearClipboard: async () => {
        if (!(window as any).require) return
        const { ipcRenderer } = (window as any).require('electron')
        await ipcRenderer.invoke('db:clear-clipboard')
        set({ clipboard: [] })
    },

    pasteEvent: (index, partialData) => {
        const { events, isLocked } = get()
        if (isLocked) return
        const target = events[index]
        if (!target) return

        // Find last index in this group to maintain group order/integrity
        let insertIdx = index
        for (let i = index; i < events.length; i++) {
            if (events[i].act === target.act && events[i].sceneId === target.sceneId && events[i].eventId === target.eventId) {
                insertIdx = i
            } else {
                break
            }
        }
        insertIdx += 1

        const newEvent: ShowEvent = {
            ...target, // Keep group IDs
            ...partialData, // Overwrite with pasted data (or different device)
            act: target.act,
            sceneId: target.sceneId,
            eventId: target.eventId
        }

        const newEvents = [...events]
        newEvents.splice(insertIdx, 0, newEvent)
        set({ events: newEvents })
        get().saveCurrentShow()
    },

    startProjection: (deviceId, _monitorIndex) => {
        const { appSettings } = get()
        const device = appSettings.devices?.find(d => d.id === deviceId)
        if (device) {
            MediaPlayer.StartMediaPlayer(device, '', false, 0, 0)
        }
    },

    mediaAction: (deviceId, action, payload) => {
        const { appSettings } = get()
        const device = appSettings.devices?.find(d => d.id === deviceId)
        if (!device) return

        switch (action) {
            case 'play':
                MediaPlayer.StartMediaPlayer(device, payload.url, payload.loop, payload.volume * 100, 0, undefined, payload.transitionTime, payload.mute)
                break
            case 'stop':
                MediaPlayer.StopMediaPlayer(device, payload.fadeOutTime)
                break
            case 'volume':
                MediaPlayer.SetVolumeMediaPlayer(device, payload.volume * 100, payload.mute)
                break
            case 'update':
                if (payload.loop !== undefined) {
                    MediaPlayer.SetRepeatMediaPlayer(device, payload.loop)
                }
                break
        }
    },

    openModal: (config) => {
        set({
            modalConfig: {
                ...config,
                isOpen: true,
                onCancel: () => {
                    if (config.onCancel) config.onCancel()
                    get().closeModal()
                },
                onConfirm: (val: string | undefined, checked?: boolean) => {
                    config.onConfirm(val, checked)
                    get().closeModal()
                },
                onClose: () => get().closeModal()
            } as any
        })
    },
    closeModal: () => set((state) => ({ modalConfig: { ...state.modalConfig, isOpen: false } })),
}))
