import type { Device, LocalMonitorDevice, VideoWallAgentDevice } from '../types/devices';
import { networkService } from './network-service';
import { videoWallAgentService } from './videowall-agent-service';

// Helper to get IPC
/**
 * Retrieves the Electron IPC renderer instance if running in a window context.
 * Useful for communicating with the main process from the frontend.
 * @returns The ipcRenderer instance or null if not available.
 */
const getIpc = () => {
    // Test if the window object has a 'require' method (Electron-specific environment)
    if ((window as any).require) {
        return (window as any).require('electron').ipcRenderer;
    }
    return null;
}

/**
 * Normalizes a file path into a URL suitable for media players.
 * Handles local paths, ledshow-file protocols, and already formatted URLs.
 * @param path The raw file path or URL.
 * @returns A formatted URL string.
 */
export const getMediaUrl = (path: string) => {
    // Test if the path is empty; if true, return an empty string
    if (!path) return ''
    // Test if the path already starts with a recognized protocol (http, file, ledshow-file)
    if (path.startsWith('http') || path.startsWith('file') || path.startsWith('ledshow-file')) return path
    // Fallback: convert local Windows/Unix path to a file:// URL and encode characters
    return `file:///${encodeURI(path.replace(/\\/g, '/'))}`
}

/**
 * Initiates media playback on a target device.
 * Supports local monitors (via Electron IPC), remote VideoWalls (via Socket.io), 
 * and hardware agents (via specialized protocol).
 * 
 * @param target The device object identifying where to play the media.
 * @param sourcefile The path or URL of the media file.
 * @param repeat Whether the media should loop.
 * @param volume The playback volume (0-100 or 0-255 depending on target).
 * @param fadeouttime Standard fade-out transition length (default 0).
 * @param previewplayer Optional HTMLVideoElement for local UI preview.
 * @param transitiontime Crossfade or fade-in transition length.
 * @param mute Whether to start playback with sound disabled.
 */
export const StartMediaPlayer = async (
    target: Device,
    sourcefile: string,
    repeat: boolean,
    volume: number,
    fadeouttime: number = 0,
    previewplayer?: any,
    transitiontime: number = 0,
    mute: boolean = false,
    projectionMaskIds?: string[],
    brightness: number = 100
) => {
    console.log('StartMediaPlayer', { target, sourcefile, repeat, volume, fadeouttime, previewplayer, transitiontime, mute, projectionMaskIds });
    const ipc = getIpc();
    const mediaUrl = getMediaUrl(sourcefile);

    // Test if the target is a locally attached monitor
    if (target.type === 'local_monitor') {
        // Test if IPC is unavailable (running outside Electron shell); if true, exit early
        if (!ipc) return;
        const d = target as LocalMonitorDevice;

        // Ensure the projection window exists for this specific device/monitor
        await ipc.invoke('start-projection', {
            deviceId: target.id,
            monitorIndex: d.monitorId !== undefined ? d.monitorId : 1
        });

        // Send the play command to the projection window
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                transitionTime: transitiontime,
                projectionMaskIds: projectionMaskIds,
                brightness: brightness
            }
        });
    }
    // Test if the target is a remote client (Web browser projection)
    else if (target.type === 'remote_VideoWall') {
        // Broadcast the media control command to the network service
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                deviceId: target.id,
                brightness: brightness
            }
        });
    }
    // Test if the target is a professional Videowall Agent hardware
    else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        // Extract and decode filename (sourcefile may be a file:// URL with %20 encoding)
        let rawFilename = sourcefile.split(/[\\/]/).pop() || '';
        try { rawFilename = decodeURIComponent(rawFilename); } catch (_) { }
        const filename = rawFilename;

        // Sync file with checksum validation first, then play via HTTP POST (more reliable after long uploads)
        videoWallAgentService.syncFileWithProgress(d, sourcefile, filename).then(() => {
            videoWallAgentService.playFile(d, filename, {
                loop: repeat || (d as any).repeat || false,
                volume: volume,
                mute: mute,
                fadeInTime: transitiontime || d.fadeInTime || 0.5,
                crossoverTime: d.crossoverTime || 1.0,
                brightness: brightness
            });
        }).catch(err => {
            console.error('Sync failed, attempting play anyway:', err);
            videoWallAgentService.playFile(d, filename, {
                loop: repeat || (d as any).repeat || false,
                volume: volume,
                mute: mute,
                fadeInTime: transitiontime || d.fadeInTime || 0.5,
                crossoverTime: d.crossoverTime || 1.0,
                brightness: brightness
            });
        });
    }

    // Handle local preview sync: Test if a preview video element was provided
    if (previewplayer instanceof HTMLVideoElement) {
        previewplayer.src = mediaUrl;
        previewplayer.play().catch(err => console.warn('MediaPlayer: Preview play failed', err));
    }
};

/**
 * Plays a media file directly on a VideoWall Agent, bypassing sync/checksum.
 * Use this during show sequence playback — the pre-flight check ensures the file exists.
 * Falls back to StartMediaPlayer for non-agent device types.
 */
export const PlayDirectOnAgent = async (
    target: Device,
    sourcefile: string,
    repeat: boolean,
    volume: number,
    transitiontime: number = 0,
    mute: boolean = false,
    brightness: number = 100
) => {
    if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        let rawFilename = sourcefile.split(/[\\\/]/).pop() || '';
        try { rawFilename = decodeURIComponent(rawFilename); } catch (_) { }
        const filename = rawFilename;
        console.log(`[PlayDirect] Sending play '${filename}' directly to agent ${d.name}`);
        videoWallAgentService.playFile(d, filename, {
            loop: repeat || (d as any).repeat || false,
            volume: volume,
            mute: mute,
            fadeInTime: transitiontime || d.fadeInTime || 0.5,
            crossoverTime: d.crossoverTime || 1.0,
            brightness: brightness
        });
    } else {
        // For all other device types, fall back to the normal StartMediaPlayer path
        await StartMediaPlayer(target, sourcefile, repeat, volume, 0, undefined, transitiontime, mute);
    }
};



/**
 * Switches the current media on a target device, typically used for seamless transitions.
 * @param target The device to update.
 * @param newSourcefile The new media file path.
 * @param transitiontime Length of the crossfade transition.
 * @param repeat Whether to loop the new media.
 * @param volume Initial volume for the new media.
 * @param mute Initial mute state.
 */
export const ChangeMediaPlayer = (
    target: Device,
    newSourcefile: string,
    transitiontime: number,
    repeat: boolean,
    volume: number,
    mute: boolean = false,
    projectionMaskIds?: string[],
    brightness: number = 100
) => {
    console.log('ChangeMediaPlayer', { target, newSourcefile, transitiontime, repeat, volume, mute, projectionMaskIds });
    const ipc = getIpc();
    const mediaUrl = getMediaUrl(newSourcefile);

    // Test if target is a local monitor
    if (target.type === 'local_monitor') {
        // Test for IPC presence
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                transitionTime: transitiontime,
                projectionMaskIds: projectionMaskIds,
                brightness: brightness
            }
        });
    }
    // Test if target is a remote web client
    else if (target.type === 'remote_VideoWall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                deviceId: target.id,
                brightness: brightness
            }
        });
    }
    // Test if target is a videowall agent node
    else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        let rawFilename = newSourcefile.split(/[\\/]/).pop() || '';
        try { rawFilename = decodeURIComponent(rawFilename); } catch (_) { }
        const filename = rawFilename;

        // Sync file with checksum validation first, then play via HTTP POST (more reliable after long uploads)
        videoWallAgentService.syncFileWithProgress(d, newSourcefile, filename).then(() => {
            videoWallAgentService.playFile(d, filename, {
                loop: repeat || (d as any).repeat || false,
                volume: volume,
                mute: mute,
                fadeInTime: transitiontime || d.fadeInTime || 0.5,
                crossoverTime: d.crossoverTime || 1.0,
                brightness: brightness
            });
        }).catch(err => {
            console.error('Sync failed, attempting play anyway:', err);
            videoWallAgentService.playFile(d, filename, {
                loop: repeat || (d as any).repeat || false,
                volume: volume,
                mute: mute,
                fadeInTime: transitiontime || d.fadeInTime || 0.5,
                crossoverTime: d.crossoverTime || 1.0,
                brightness: brightness
            });
        });
    }
};

/**
 * Stops playback on a target device.
 * @param target The device to stop.
 * @param fadeouttime Duration of the fade-out effect.
 */
export const StopMediaPlayer = (
    target: Device,
    fadeouttime: number = 0
) => {
    console.log('StopMediaPlayer', { target, fadeouttime });
    const ipc = getIpc();

    // Test if target is local monitor
    if (target.type === 'local_monitor') {
        // Test for IPC presence
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'stop',
            payload: {
                fadeOutTime: fadeouttime
            }
        });
    }
    // Test if target is remote web client
    else if (target.type === 'remote_VideoWall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'stop',
            payload: { deviceId: target.id, fadeOutTime: fadeouttime }
        });
    }
    // Test if target is videowall agent node
    else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        videoWallAgentService.sendCommand(d, 'stop', {
            fadeOutTime: fadeouttime || d.fadeOutTime || 0.5
        });
    }
};

/**
 * Adjusts the volume or mute state of current playback on a target device.
 * @param target The device to update.
 * @param newVolume New volume level.
 * @param mute Whether to immediately mute the sound.
 */
export const SetVolumeMediaPlayer = (
    target: Device,
    newVolume: number,
    mute: boolean = false
) => {
    console.log('SetVolumeMediaPlayer', { target, newVolume, mute });
    const ipc = getIpc();

    // Test if target is local monitor
    if (target.type === 'local_monitor') {
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'volume',
            payload: {
                volume: newVolume,
                mute: mute || newVolume === 0
            }
        });
    }
    // Test if target is remote web client
    else if (target.type === 'remote_VideoWall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'volume',
            payload: {
                deviceId: target.id,
                volume: newVolume,
                mute: mute || newVolume === 0
            }
        });
    }
    // Test if target is videowall agent node
    else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        videoWallAgentService.sendCommand(d, 'volume', {
            level: mute ? 0 : newVolume
        });
    }
};

/**
 * Toggles the looping/repeat behavior of current playback on a target device.
 * @param target The device to update.
 * @param repeat Whether to set playback to loop.
 */
    /**
     * Adjusts the brightness of the current playback on a target device in real-time.
     * @param target The device to update.
     * @param newBrightness New brightness level (0-100+).
     */
    export const SetBrightnessMediaPlayer = (
        target: Device,
        newBrightness: number
    ) => {
        console.log('SetBrightnessMediaPlayer', { target, newBrightness });
        const ipc = getIpc();
    
        // Test if target is local monitor
        if (target.type === 'local_monitor') {
            if (!ipc) return;
            ipc.send('media-command', {
                deviceId: target.id,
                command: 'update',
                payload: {
                    brightness: newBrightness
                }
            });
        }
        // Test if target is remote web client
        else if (target.type === 'remote_VideoWall') {
            networkService.sendCommand({
                type: 'MEDIA_CONTROL',
                action: 'brightness',
                payload: {
                    deviceId: target.id,
                    level: newBrightness
                }
            });
        }
        // Test if target is videowall agent node
        else if (target.type === 'videowall_agent') {
            const d = target as VideoWallAgentDevice;
            videoWallAgentService.sendBrightness(d, newBrightness);
        }
    };
    
    export const SetRepeatMediaPlayer = (
    target: Device,
    repeat: boolean
) => {
    console.log('SetRepeatMediaPlayer', { target, repeat });
    const ipc = getIpc();

    // Test if target is local monitor
    if (target.type === 'local_monitor') {
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'update',
            payload: {
                loop: repeat
            }
        });
    }
    // Test if target is remote web client
    else if (target.type === 'remote_VideoWall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'toggle_repeat',
            payload: {
                deviceId: target.id,
                repeat: repeat
            }
        });
    }
    // Test if target is videowall agent node
    else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        videoWallAgentService.sendCommand(d, 'repeat', {
            repeat: repeat
        });
    }
};

export const StartProjection = async (device: Device, monitorIndex: number) => {
    const ipc = getIpc();
    if (!ipc) return;
    await ipc.invoke('start-projection', {
        deviceId: device.id,
        monitorIndex: monitorIndex
    });
};

export const MediaAction = (device: Device, action: string, payload?: any) => {
    const ipc = getIpc();
    if (!ipc) return;
    ipc.send('media-command', {
        deviceId: device.id,
        command: action,
        payload: payload
    });
};
