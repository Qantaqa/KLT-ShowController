import { type StateCreator } from 'zustand';
import { type ShowState } from '../types';
import type { ShowProfile, AppSettingsProfile, KeyboardBinding } from '../../types/show';
import { networkService } from '../../services/network-service';
import { XmlService } from '../../services/xml-service';
import { showInitService } from '../../services/show-init-service';

export interface AppSlice {
    activeShow: ShowProfile | null;
    availableShows: ShowProfile[];
    showsLoading: boolean;
    showsLoadError: string | null;
    appSettings: AppSettingsProfile;
    isAuthorized: boolean;
    registrationStatus: 'NOT_FOUND' | 'WAITING_PIN' | 'WAITING_HOST_PIN' | 'WAITING_REGISTRATION' | 'AUTHORIZED' | 'STARTING' | null;
    registrationData: any;
    appLocked: boolean;
    toasts: { id: string, type: 'info' | 'warning' | 'error', message: string }[];
    modalConfig: {
        isOpen: boolean;
        title: string;
        message: string;
        type: 'confirm' | 'prompt';
        defaultValue?: string;
        showCheckbox?: boolean;
        checkboxLabel?: string;
        onConfirm: (val?: string, checked?: boolean) => void;
        onCancel?: () => void;
        onClose?: () => void;
        confirmLabel?: string;
        cancelLabel?: string;
    };
    connectedClients: any[];
    isSynced: boolean;
    clientUUID: string;
    clientFriendlyName: string;

    addToast: (message: string, type?: 'info' | 'warning' | 'error', durationMs?: number) => void;
    removeToast: (id: string) => void;
    openModal: (config: any) => void;
    closeModal: () => void;
    setActiveShow: (show: ShowProfile) => Promise<void>;
    updateActiveShow: (partial: Partial<ShowProfile>) => Promise<void>;
    updateActiveShowPdf: (path: string) => void;
    updateActiveShowSidebarWidth: (width: number) => void;
    createNewShow: (name: string, scriptPath?: string) => Promise<void>;
    archiveShow: (id: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    saveCurrentShow: () => Promise<void>;
    initializeShows: () => Promise<void>;
    updateAppSettings: (partial: Partial<AppSettingsProfile>) => Promise<void>;
    importShow: (name: string, xmlContent: string, xmlPath?: string) => Promise<void>;
    broadcastState: () => void;
    syncAppSettings: (settings: AppSettingsProfile) => void;
    syncFromRemote: (state: any) => void;
    setConnectedClients: (ids: any[]) => void;
    verifyHostPin: (pin: string) => void;
    completeRegistration: (name: string, pin: string) => void;
    verifyClientPin: (pin: string) => void;
    setAppLocked: (locked: boolean) => void;
    setCurrentScriptPage: (page: number) => void;
    /** Set by autoFollowScript when an event with a scriptPg is cued.
     *  Broadcast as EVENT_PAGE to remotes. Remote clients jump to this page. */
    eventPage: number | null;
    setEventPage: (page: number) => void;
    keyboardBindings: KeyboardBinding[];
    updateKeyboardBindings: (bindings: KeyboardBinding[]) => Promise<void>;
    initializeKeyboardBindings: () => Promise<void>;
}

export const createAppSlice: StateCreator<
    ShowState,
    [],
    [],
    AppSlice
> = (set, get) => ({
    activeShow: null,
    availableShows: [],
    showsLoading: false,
    showsLoadError: null,
    appSettings: {
        defaultLogo: '',
        accessPin: '',
        serverPort: 3001,
        serverIp: 'localhost',
        controllerMonitorIndex: 0,
        devices: []
    },
    isAuthorized: !!(window as any).require,
    registrationStatus: !!(window as any).require ? 'AUTHORIZED' : 'STARTING',
    registrationData: {},
    appLocked: false,
    toasts: [],
    modalConfig: {
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: () => { }
    },
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
    eventPage: null,

    addToast: (message, type = 'info', durationMs = 5000) => {
        const id = Math.random().toString(36).substring(7)
        set(state => ({ toasts: [...state.toasts, { id, type, message }] }))
        setTimeout(() => get().removeToast(id), durationMs)
    },

    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

    openModal: (config) => {
        const { closeModal } = get();
        const wrappedConfig = {
            ...config,
            onConfirm: (val?: string, checked?: boolean) => {
                config.onConfirm(val, checked);
                closeModal();
            },
            onCancel: () => {
                if (config.onCancel) config.onCancel();
                closeModal();
            },
            onClose: () => {
                if (config.onClose) config.onClose();
                closeModal();
            }
        };
        set({ modalConfig: { ...wrappedConfig, isOpen: true } });
    },

    closeModal: () => set(state => ({ modalConfig: { ...state.modalConfig, isOpen: false } })),


    setActiveShow: async (show) => {
        if (show && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            let events = await ipcRenderer.invoke('db:get-sequences', show.id)

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

            set({ events, activeShow: show, isLocked: true, timingRunStartedAt: null, stopButtonFlashRequest: false })
            void get().refreshShowTimingFromDb()
            get().broadcastState()
            localStorage.setItem('ledshow_last_show_id', show.id)
        }
    },

    updateActiveShow: async (partial) => {
        const { activeShow, availableShows, saveCurrentShow } = get()
        if (activeShow) {
            const updated = { ...activeShow, ...partial }
            const newAvailable = availableShows.map(s => s.id === activeShow.id ? updated : s)
            set({
                activeShow: updated,
                availableShows: newAvailable
            })
            await saveCurrentShow()
        }
    },

    updateActiveShowPdf: (path) => get().updateActiveShow({ pdfPath: path }),

    updateActiveShowSidebarWidth: (width) => get().updateActiveShow({ sidebarWidth: width }),

    createNewShow: async (name, scriptPath) => {
        const { addToast } = get()
        const trimmedName = (name || '').trim()
        if (!trimmedName) throw new Error('Show naam mag niet leeg zijn')

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
                await ipcRenderer.invoke('db:create-show', newShow)
                await ipcRenderer.invoke('db:save-sequences', { showId: newId, events: initialEvents })
            }

            set(state => ({
                availableShows: [...state.availableShows, newShow],
                activeShow: newShow,
                events: initialEvents,
                activeEventIndex: -1,
                timingRunStartedAt: null,
                stopButtonFlashRequest: false,
                isLocked: false
            }))
            void get().refreshShowTimingFromDb()
            localStorage.setItem('ledshow_last_show_id', newId)
        } catch (error: any) {
            console.error('Failed to create new show:', error)
            addToast(`Fout bij aanmaken show: ${error.message || 'Onbekende fout'}`, 'error')
            throw error
        }
    },

    archiveShow: async (id: string) => {
        const { availableShows, activeShow, addToast, setActiveShow } = get()
        try {
            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron')
                await ipcRenderer.invoke('db:archive-show', { id, archived: true })
            }

            const newAvailable = availableShows.filter(s => s.id !== id)
            if (activeShow?.id === id) {
                const nextShow = newAvailable.length > 0 ? newAvailable[0] : null
                set({ availableShows: newAvailable, activeShow: nextShow })
                if (nextShow) await setActiveShow(nextShow)
                else {
                    set({ events: [], timingRunStartedAt: null, stopButtonFlashRequest: false })
                    void get().refreshShowTimingFromDb()
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
                set({ availableShows: newAvailable, activeShow: null, events: [], timingRunStartedAt: null, stopButtonFlashRequest: false })
                void get().refreshShowTimingFromDb()
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
        if (!(window as any).require) return

        // Ensure initializeShows is single-flight (avoid overlapping calls)
        const anyGlobal = globalThis as any
        if (anyGlobal.__hubInitializeShowsPromise) {
            return anyGlobal.__hubInitializeShowsPromise
        }

        const { addToast } = get()
        const { ipcRenderer } = (window as any).require('electron')

        const safeJsonParse = (val: any, fallback: any = {}) => {
            if (val === null || val === undefined) return fallback
            if (typeof val === 'object') return val
            if (typeof val === 'string') {
                try { return JSON.parse(val) } catch { return fallback }
            }
            return fallback
        }

        const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

        const run = (async () => {
            set({ showsLoading: true, showsLoadError: null })
            try {
                // Retry a few times; on cold start the DB / IPC can be transiently unavailable.
                const delaysMs = [0, 200, 500, 1000, 1500]
                let lastErr: any = null

                for (let attempt = 0; attempt < delaysMs.length; attempt++) {
                    if (delaysMs[attempt] > 0) await wait(delaysMs[attempt])
                    try {
                        const dbShows: any[] = await ipcRenderer.invoke('db:get-shows')

                        const available: ShowProfile[] = (dbShows || []).map(s => ({
                            ...s,
                            invertScriptColors: !!s.invertScriptColors,
                            schedule: safeJsonParse(s.schedule, {}),
                            viewState: safeJsonParse(s.viewState, {})
                        }))

                        const lastShowId = localStorage.getItem('ledshow_last_show_id')
                        const active = lastShowId ? available.find(s => s.id === lastShowId) || null : null

                        const appSettings = await ipcRenderer.invoke('db:get-app-settings')
                        if (appSettings?.defaultLogo && appSettings.defaultLogo.startsWith('ledshow-file://')) {
                            const port = (appSettings.serverPort || 3001) + 1
                            appSettings.defaultLogo = `http://localhost:${port}/logo`
                            await ipcRenderer.invoke('db:update-app-settings', appSettings)
                        }

                        const globalDevices = await ipcRenderer.invoke('db:get-devices', 'GLOBAL')

                        set({
                            availableShows: available,
                            activeShow: null,
                            events: [],
                            activeEventIndex: -1,
                            timingRunStartedAt: null,
                            stopButtonFlashRequest: false,
                            appSettings: { ...appSettings, devices: globalDevices || [] },
                            showsLoading: false,
                            showsLoadError: null
                        })
                        void get().refreshShowTimingFromDb()

                        networkService.registerClient()

                        if (active) await get().setActiveShow(active)

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

                        return
                    } catch (e) {
                        lastErr = e
                        // Continue retrying
                    }
                }

                const msg = (lastErr && (lastErr.message || String(lastErr))) || 'Onbekende fout'
                console.error('Project initialization failure:', lastErr)
                set({ showsLoading: false, showsLoadError: msg })
                addToast(`Kon shows niet laden: ${msg}`, 'error')
            } finally {
                // Always clear the single-flight promise
                anyGlobal.__hubInitializeShowsPromise = null
                set(state => state.showsLoading ? { showsLoading: false } as any : ({} as any))
            }
        })()

        anyGlobal.__hubInitializeShowsPromise = run
        return run
    },

    updateAppSettings: async (partial) => {
        const { appSettings, addToast } = get()
        const newSettings = { ...appSettings, ...partial }
        set({ appSettings: newSettings })
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:update-app-settings', partial)

                // If devices were updated, persist them to the GLOBAL show as well
                if (partial.devices) {
                    await ipcRenderer.invoke('db:save-sequences', { showId: 'GLOBAL', events: [] }) // Dummy call if needed, but we really need save-devices
                    await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices: partial.devices })
                }
            } catch (error: any) {
                console.error('Failed to update app settings:', error)
                addToast(`Fout bij bijwerken instellingen: ${error.message || 'Onbekende fout'}`, 'error')
                throw error
            }
        }
    },

    importShow: async (name, xmlContent, xmlPath) => {
        const { addToast } = get()
        const xmlService = new XmlService()
        const importedEvents = xmlService.parseShow(xmlContent, xmlPath)
        let trimmedName = (name || '').trim() || (xmlPath ? xmlPath.split(/[\\/]/).pop()?.replace(/\.xml$/i, '') : 'Imported Show')
        if (!trimmedName) throw new Error('Show naam mag niet leeg zijn')
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
                activeEventIndex: -1,
                timingRunStartedAt: null,
                stopButtonFlashRequest: false
            }))
            void get().refreshShowTimingFromDb()
            localStorage.setItem('ledshow_last_show_id', newId)
        } catch (error: any) {
            console.error('Failed to import show:', error)
            addToast(`Fout bij importeren show: ${error.message || 'Onbekende fout'}`, 'error')
            throw error
        }
    },

    broadcastState: () => {
        const { activeShow, events, activeEventIndex, isLocked, appSettings, blinkingNextEvent, blinkingNextScene, blinkingNextAct, navigationWarning, lastTransitionTime, runtimeCollapsedGroups } = get()
        if (activeShow) {
            const remoteAppSettings = { ...appSettings }
            if (remoteAppSettings.defaultLogo && remoteAppSettings.defaultLogo.includes('localhost')) {
                const serverIp = remoteAppSettings.serverIp || 'localhost'
                remoteAppSettings.defaultLogo = remoteAppSettings.defaultLogo.replace('localhost', serverIp)
            }
            networkService.sendCommand({
                type: 'STATE_SYNC',
                state: {
                    activeShow, events, activeEventIndex, isLocked, appSettings: remoteAppSettings,
                    blinkingNextEvent, blinkingNextScene, blinkingNextAct, navigationWarning,
                    lastTransitionTime, runtimeCollapsedGroups
                }
            })
        }
    },

    syncAppSettings: (appSettings) => set({ appSettings }),

    syncFromRemote: (state) => set({
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
    }),

    setConnectedClients: (ids) => set({ connectedClients: ids }),

    verifyHostPin: (pin) => networkService.sendCommand({ type: 'VERIFY_HOST_PIN', pin }),

    completeRegistration: (name, pin) => networkService.sendCommand({ type: 'COMPLETE_REGISTRATION', friendlyName: name, pinCode: pin }),

    verifyClientPin: (pin) => networkService.sendCommand({ type: 'VERIFY_CLIENT_PIN', pin }),

    setAppLocked: (locked) => {
        set({ appLocked: locked })
        networkService.sendCommand({ type: 'SET_LOCKED', locked })
    },

    setCurrentScriptPage: (page: number) => set(state => ({
        activeShow: state.activeShow ? { ...state.activeShow, viewState: { ...state.activeShow.viewState, currentScriptPage: page } } : null
    })),

    setEventPage: (page: number) => {
        // Update local host view
        set(state => ({
            activeShow: state.activeShow ? { ...state.activeShow, viewState: { ...state.activeShow.viewState, currentScriptPage: page } } : null,
            eventPage: page
        }))
        // Broadcast to remote clients — only Electron host triggers this
        if (!!(window as any).require) {
            networkService.sendCommand({ type: 'EVENT_PAGE', page })
        }
    },

    keyboardBindings: [],
    updateKeyboardBindings: async (bindings: KeyboardBinding[]) => {
        set({ keyboardBindings: bindings });
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            await ipcRenderer.invoke('db:save-keyboard-bindings', bindings);
        }
    },
    initializeKeyboardBindings: async () => {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            const bindings = await ipcRenderer.invoke('db:get-keyboard-bindings');
            set({ keyboardBindings: bindings || [] });
        }
    }

});
