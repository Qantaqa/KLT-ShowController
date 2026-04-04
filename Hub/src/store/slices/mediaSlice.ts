import { type StateCreator } from 'zustand';
import { type ShowState } from '../types';
import * as MediaPlayer from '../../services/media-player-service';
import { PlayDirectOnAgent, ResumeMediaPlayer } from '../../services/media-player-service';
import type { LocalMonitorDevice, VideoWallAgentDevice } from '../../types/devices';
import { networkService } from '../../services/network-service';

/** Laatste afspeelstatus per device (projection → hub via IPC). */
export type MediaPlaybackSnapshot = {
    currentTime?: number
    duration?: number
    playing?: boolean
    paused?: boolean
    lastUpdated?: number
}

export interface MediaSlice {
    mediaPlaybackByDevice: Record<string, MediaPlaybackSnapshot>
    applyMediaPlaybackStatus: (deviceId: string, status: Partial<MediaPlaybackSnapshot>) => void

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
    pauseMedia: (index: number) => void;
    stopMedia: (index: number) => void;
    stopMediaAt: (act: string, sceneId: number, eventId: number) => void;
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
    mediaPlaybackByDevice: {},
    applyMediaPlaybackStatus: (deviceId: string, status: Partial<MediaPlaybackSnapshot>) => {
        if (!deviceId) return
        set(s => {
            const prev = s.mediaPlaybackByDevice[deviceId] || {}
            return {
                mediaPlaybackByDevice: {
                    ...s.mediaPlaybackByDevice,
                    [deviceId]: { ...prev, ...status, lastUpdated: Date.now() }
                }
            }
        })
    },

    playingMedia: {},
    isCameraActive: false,
    isSelfPreviewVisible: true,
    activeCameraStreams: {},
    selectedCameraClients: [],
    dismissedWebcams: [],
    persistentLights: {},

    restartMedia: (index: number) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'restartMedia',
                index,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
        const { events, appSettings, playingMedia } = get()
        const event = events[index]
        if (!event) return

        const toNumberOrUndef = (v: any) => {
            const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v)
            return Number.isFinite(n) ? n : undefined
        }

        const targetName = (event.fixture || '').trim().toLowerCase()
        const devices = appSettings.devices || []
        const targets = devices.filter((d: any) => {
            const isTypeMatch = d.type === 'local_monitor' || d.type === 'remote_VideoWall' || d.type === 'videowall_agent'
            const isEnabled = (d as any).enabled !== false
            const isNameMatch = !targetName || targetName === '*' || d.name.trim().toLowerCase() === targetName
            return isTypeMatch && isEnabled && isNameMatch
        })

        // `playingMedia` keeps track of what's currently playing per device.
        // Keys are device ids (stringified) so we can reliably match Object.entries(...) keys.
        // Values include the stop marker (stopAct/stopSceneId/stopEventId) used by stopMediaAt().
        const newPlaying = { ...playingMedia }
        targets.forEach((d: any) => {
            const mediaUrl = event.filename || ''
            const repeat = event.type === 'media' && event.effect === 'repeat'
            const volume = event.intensity !== undefined ? event.intensity : 100
            const mute = !event.sound
            const projectionMasks = event.projectionMasks

            const brightness = event.brightness !== undefined ? event.brightness : 100
            // Stop marker:
            // - Set in the SequenceGrid UI ("Stop At") on the media/light row.
            // - When show navigation enters that target event group, stopMediaAt(...) will match and fade out the device.
            const stopSceneId = toNumberOrUndef(event.stopSceneId)
            const stopEventId = toNumberOrUndef(event.stopEventId)
            const stopAct =
                (event.stopAct || '').trim() ||
                // If only scene/event is set, default stopAct to the current event's act.
                ((stopSceneId !== undefined || stopEventId !== undefined)
                    ? (event.act || '').trim() || undefined
                    : undefined)

            // ShowEvent.transition is stored in seconds (used by lights and agent fadeInTime).
            // Local monitor projection window expects milliseconds.
            const localTransitionMs = (toNumberOrUndef(event.transition) ?? 0) > 0
                ? (event.transition * 1000)
                : ((d.type === 'local_monitor'
                    ? ((d as LocalMonitorDevice).fadeInTime ?? (d as LocalMonitorDevice).transitionTime ?? 0.5)
                    : 0) * 1000)

            if (d.type === 'videowall_agent') {
                // Direct play — no sync — pre-flight check ensures media is present
                PlayDirectOnAgent(d as VideoWallAgentDevice, mediaUrl, repeat, volume, toNumberOrUndef(event.transition) ?? 0, mute, brightness)
            } else {
                const transitionArg = d.type === 'local_monitor' ? localTransitionMs : (toNumberOrUndef(event.transition) ?? 0)
                MediaPlayer.StartMediaPlayer(d, mediaUrl, repeat, volume, 0, undefined, transitionArg, mute, projectionMasks, brightness)
            }
            newPlaying[String(d.id)] = {
                filename: event.filename || '',
                timestamp: Date.now(),
                stopAct,
                stopSceneId,
                stopEventId
            }
        })
        set({ playingMedia: newPlaying })
    },

    pauseMedia: (index: number) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'pauseMedia',
                index,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
        const { events, appSettings } = get()
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

        targets.forEach((d: any) => {
            MediaPlayer.PauseMediaPlayer(d)
        })
    },

    stopMedia: (index: number) => {
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'stopMedia',
                index,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
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
            delete newPlaying[String(d.id)]
        })
        set({ playingMedia: newPlaying })
    },

    /**
     * Auto-stop any currently playing media that declares a stop marker
     * matching the given Act/Scene/Event group.
     *
     * Used during show navigation: when we ENTER the stop event, we fade out and go to black.
     */
    stopMediaAt: (act: string, sceneId: number, eventId: number) => {
        const { appSettings, playingMedia } = get()
        const devices = appSettings.devices || []

        const newPlaying = { ...playingMedia }
        const targetAct = (act || '').trim()
        const targetScene = Number.isFinite(sceneId as number) ? sceneId : 0
        const targetEvent = Number.isFinite(eventId as number) ? eventId : 0

        const toNumberOrZero = (v: any) => {
            const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v)
            return Number.isFinite(n) ? n : 0
        }
        // Called by the host when a new event group becomes active (SequenceSlice.setActiveEvent).
        // It checks all currently playing devices for a matching stop marker and then
        // calls MediaPlayer.StopMediaPlayer(...) with the device's configured fadeOutTime.
        for (const [deviceId, info] of Object.entries(playingMedia)) {
            const stopScene = toNumberOrZero(info?.stopSceneId)
            const stopEvent = toNumberOrZero(info?.stopEventId)
            const stopAct = (info?.stopAct || '').trim() || ((stopScene !== 0 || stopEvent !== 0) ? targetAct : '')
            if (!stopAct) continue

            if (stopAct === targetAct && stopScene === targetScene && stopEvent === targetEvent) {
                // Device ids coming from Object.entries(...) are strings; normalize to avoid mismatches.
                const d = devices.find((x: any) => String(x.id) === String(deviceId))
                if (!d || (d as any).enabled === false) {
                    delete newPlaying[deviceId]
                    continue
                }
                const dLocal = d.type === 'local_monitor' ? d as LocalMonitorDevice : null
                const fadeOutTime = (dLocal?.fadeOutTime || 0.5) * 1000
                MediaPlayer.StopMediaPlayer(d as any, fadeOutTime)
                delete newPlaying[deviceId]
            }
        }
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
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'setMediaVolume',
                index,
                volume,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
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
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'toggleAudio',
                index,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
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
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'toggleRepeat',
                index,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
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
        const isHost = !!(window as any).require
        if (!isHost) {
            const { events } = get()
            const e = events[index]
            networkService.sendCommand({
                type: 'HOST_MEDIA_CONTROL',
                action: 'setMediaBrightness',
                index,
                brightness,
                eventRef: e ? {
                    act: e.act,
                    sceneId: e.sceneId,
                    eventId: e.eventId,
                    type: e.type,
                    cue: e.cue,
                    filename: (e as any).filename,
                    fixture: e.fixture,
                } : undefined
            })
            return
        }
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
