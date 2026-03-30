import { type StateCreator } from 'zustand';
import { type ShowState } from '../types';
import * as MediaPlayer from '../../services/media-player-service';
import { PlayDirectOnAgent } from '../../services/media-player-service';
import type { LocalMonitorDevice, VideoWallAgentDevice } from '../../types/devices';

export interface MediaSlice {
    playingMedia: Record<string, {
        filename: string;
        timestamp: number;
        stopAct?: string;
        stopSceneId?: number;
        stopEventId?: number;
    }>;
    isCameraActive: boolean;
    isSelfPreviewVisible: boolean;
    activeCameraStreams: Record<string, string>;
    selectedCameraClients: string[];
    dismissedWebcams: string[];
    persistentLights: Record<string, {
        fixture: string;
        stopAct: string;
        stopSceneId: number;
        stopEventId: number;
    }>;

    restartMedia: (index: number) => void;
    stopMedia: (index: number) => void;
    stopAllMedia: () => void;
    setMediaVolume: (index: number, volume: number) => void;
    toggleAudio: (index: number) => void;
    toggleRepeat: (index: number) => void;
    setMediaBrightness: (index: number, brightness: number) => void;
    startProjection: (deviceId: string, monitorIndex: number) => void;
    mediaAction: (deviceId: string, action: string, payload?: any) => void;

    // Camera actions
    setCameraActive: (active: boolean) => void;
    updateCameraFrame: (clientId: string, frame: string) => void;
    clearCameraStream: (clientId: string) => void;
    toggleCameraSelection: (clientId: string) => void;
    dismissCameraStream: (clientId: string) => void;
    setSelfPreviewVisible: (visible: boolean) => void;
}

export const createMediaSlice: StateCreator<
    ShowState,
    [],
    [],
    MediaSlice
> = (set, get) => ({
    playingMedia: {},
    isCameraActive: false,
    isSelfPreviewVisible: true,
    activeCameraStreams: {},
    selectedCameraClients: [],
    dismissedWebcams: [],
    persistentLights: {},

    restartMedia: (index: number) => {
        const { events, appSettings, playingMedia } = get()
        const event = events[index]
        if (!event) return

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter((d: any) => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        const newPlaying = { ...playingMedia }
        targets.forEach((d: any) => {
            const mediaUrl = event.filename || ''
            const repeat = event.type === 'media' && event.effect === 'repeat'
            const volume = event.intensity !== undefined ? event.intensity : 100
            const mute = !event.sound
            const projectionMaskIds = event.projectionMaskIds

            const brightness = event.brightness !== undefined ? event.brightness : 100

            if (d.type === 'videowall_agent') {
                // Direct play — no sync — pre-flight check ensures media is present
                PlayDirectOnAgent(d as VideoWallAgentDevice, mediaUrl, repeat, volume, event.transition, mute, brightness)
            } else {
                MediaPlayer.StartMediaPlayer(d, mediaUrl, repeat, volume, 0, undefined, event.transition, mute, projectionMaskIds, brightness)
            }
            newPlaying[d.id] = { filename: event.filename || '', timestamp: Date.now() }
        })
        set({ playingMedia: newPlaying })
    },

    stopMedia: (index: number) => {
        const { events, appSettings, playingMedia } = get()
        const event = events[index]
        if (!event) return

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter((d: any) => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        const newPlaying = { ...playingMedia }
        targets.forEach((d: any) => {
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

        devices.filter((d: any) => (d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent') && (d as any).enabled !== false).forEach((d: any) => {
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
        const targets = devices.filter((d: any) => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        targets.forEach((d: any) => {
            MediaPlayer.SetVolumeMediaPlayer(d, volume, !event.sound)
        })
    },

    toggleAudio: (index: number) => {
        const { events, appSettings, updateEvent } = get()
        const event = events[index]
        if (event) {
            const newState = !event.sound
            updateEvent(index, { sound: newState })

            const targetName = (event.fixture || '').trim().toLowerCase()
            const devices = appSettings.devices || []
            const targets = devices.filter((d: any) => {
                const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
                const isEnabled = (d as any).enabled !== false
                const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                return isTypeMatch && isEnabled && isNameMatch
            })

            targets.forEach((d: any) => {
                const vol = event.intensity !== undefined ? event.intensity : 100
                MediaPlayer.SetVolumeMediaPlayer(d, vol, !newState)
            })
        }
    },

    toggleRepeat: (index: number) => {
        const { events, appSettings, updateEvent } = get()
        const event = events[index]
        if (event) {
            const newState = event.effect !== 'repeat'
            updateEvent(index, { effect: newState ? 'repeat' : '' })

            const targetName = (event.fixture || '').trim().toLowerCase()
            const devices = appSettings.devices || []
            const targets = devices.filter((d: any) => {
                const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
                const isEnabled = (d as any).enabled !== false
                const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
                return isTypeMatch && isEnabled && isNameMatch
            })

            targets.forEach((d: any) => {
                MediaPlayer.SetRepeatMediaPlayer(d, newState)
            })
        }
    },

    setMediaBrightness: (index: number, brightness: number) => {
        const { events, appSettings, updateEvent } = get()
        const event = events[index]
        if (!event) return

        updateEvent(index, { brightness })

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter((d: any) => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        targets.forEach((d: any) => {
            MediaPlayer.SetBrightnessMediaPlayer(d, brightness)
        })
    },

    setCameraActive: (active: boolean) => {
        const { clientUUID, appSettings, updateAppSettings } = get()
        set({ isCameraActive: active })

        const configs = { ...(appSettings.clientConfigs || {}) }
        configs[clientUUID] = {
            ...(configs[clientUUID] || {}),
            isCameraActive: active,
            lastSeen: Date.now()
        }
        updateAppSettings({ clientConfigs: configs })
    },

    updateCameraFrame: (clientId: string, frame: string) => set((state) => ({
        activeCameraStreams: { ...state.activeCameraStreams, [clientId]: frame }
    })),

    clearCameraStream: (clientId: string) => set((state) => {
        const streams = { ...state.activeCameraStreams }
        delete streams[clientId]
        return { activeCameraStreams: streams }
    }),

    toggleCameraSelection: (clientId: string) => {
        const { selectedCameraClients, clientUUID, appSettings, updateAppSettings } = get()
        let selected = [...selectedCameraClients]
        if (selected.includes(clientId)) {
            selected = selected.filter(id => id !== clientId)
        } else {
            if (selected.length >= 2) selected.shift()
            selected.push(clientId)
        }
        set({ selectedCameraClients: selected })

        const configs = { ...(appSettings.clientConfigs || {}) }
        configs[clientUUID] = {
            ...(configs[clientUUID] || {}),
            selectedCameraClients: selected,
            lastSeen: Date.now()
        }
        updateAppSettings({ clientConfigs: configs })
    },

    dismissCameraStream: (clientId: string) => set((state) => ({
        dismissedWebcams: [...state.dismissedWebcams, clientId],
        selectedCameraClients: state.selectedCameraClients.filter(id => id !== clientId)
    })),

    setSelfPreviewVisible: (visible: boolean) => {
        const { clientUUID, appSettings, updateAppSettings } = get()
        set({ isSelfPreviewVisible: visible })

        const configs = { ...(appSettings.clientConfigs || {}) }
        configs[clientUUID] = {
            ...(configs[clientUUID] || {}),
            isSelfPreviewVisible: visible,
            lastSeen: Date.now()
        }
        updateAppSettings({ clientConfigs: configs })
    },

    startProjection: (deviceId: string, monitorIndex: number) => {
        const { appSettings } = get()
        const device = (appSettings.devices || []).find(d => d.id === deviceId)
        if (device) {
            MediaPlayer.StartProjection(device, monitorIndex)
        }
    },

    mediaAction: (deviceId: string, action: string, payload?: any) => {
        const { appSettings } = get()
        const device = (appSettings.devices || []).find(d => d.id === deviceId)
        if (device) {
            MediaPlayer.MediaAction(device, action, payload)
        }
    },
});
