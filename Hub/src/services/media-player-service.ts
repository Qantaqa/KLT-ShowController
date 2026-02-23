import type { Device, LocalMonitorDevice, VideoWallAgentDevice } from '../store/useShowStore';
import { networkService } from './network-service';
import { videoWallAgentService } from './videowall-agent-service';

// Helper to get IPC
const getIpc = () => {
    if ((window as any).require) {
        return (window as any).require('electron').ipcRenderer;
    }
    return null;
}

export const getMediaUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('http') || path.startsWith('file') || path.startsWith('ledshow-file')) return path
    return `file:///${encodeURI(path.replace(/\\/g, '/'))}`
}

export const StartMediaPlayer = async (
    target: Device,
    sourcefile: string,
    repeat: boolean,
    volume: number,
    fadeouttime: number = 0,
    previewplayer?: any,
    transitiontime: number = 0,
    mute: boolean = false
) => {
    console.log('StartMediaPlayer', { target, sourcefile, repeat, volume, fadeouttime, previewplayer, transitiontime, mute });
    const ipc = getIpc();
    const mediaUrl = getMediaUrl(sourcefile);

    if (target.type === 'local_monitor') {
        if (!ipc) return;
        const d = target as LocalMonitorDevice;
        // Ensure window exists
        await ipc.invoke('start-projection', {
            deviceId: target.id,
            monitorIndex: d.monitorId !== undefined ? d.monitorId : 1
        });

        // Send play command
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                transitionTime: transitiontime
            }
        });
    } else if (target.type === 'remote_ledwall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                deviceId: target.id
            }
        });
    } else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        const filename = sourcefile.split(/[\\/]/).pop() || '';
        videoWallAgentService.sendCommand(d, 'play', {
            filename: filename,
            loop: repeat || d.repeat || false,
            volume: volume,
            mute: mute,
            fadeInTime: transitiontime || d.fadeInTime || 0.5,
            crossoverTime: d.crossoverTime || 1.0
        });
    }

    // Handle preview player if provided
    if (previewplayer instanceof HTMLVideoElement) {
        previewplayer.src = mediaUrl;
        previewplayer.play().catch(err => console.warn('MediaPlayer: Preview play failed', err));
    }
};

export const ChangeMediaPlayer = (
    target: Device,
    newSourcefile: string,
    transitiontime: number,
    repeat: boolean,
    volume: number,
    mute: boolean = false
) => {
    console.log('ChangeMediaPlayer', { target, newSourcefile, transitiontime, repeat, volume, mute });
    const ipc = getIpc();
    const mediaUrl = getMediaUrl(newSourcefile);

    if (target.type === 'local_monitor') {
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                transitionTime: transitiontime
            }
        });
    } else if (target.type === 'remote_ledwall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'play',
            payload: {
                url: mediaUrl,
                loop: repeat,
                volume: volume,
                mute: mute,
                deviceId: target.id
            }
        });
    } else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        const filename = newSourcefile.split(/[\\/]/).pop() || '';
        videoWallAgentService.sendCommand(d, 'play', {
            filename: filename,
            loop: repeat || d.repeat || false,
            volume: volume,
            mute: mute,
            fadeInTime: transitiontime || d.fadeInTime || 0.5,
            crossoverTime: d.crossoverTime || 1.0
        });
    }
};

export const StopMediaPlayer = (
    target: Device,
    fadeouttime: number = 0
) => {
    console.log('StopMediaPlayer', { target, fadeouttime });
    const ipc = getIpc();

    if (target.type === 'local_monitor') {
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'stop',
            payload: {
                fadeOutTime: fadeouttime
            }
        });
    } else if (target.type === 'remote_ledwall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'stop',
            payload: { deviceId: target.id, fadeOutTime: fadeouttime }
        });
    } else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        videoWallAgentService.sendCommand(d, 'stop', {
            fadeOutTime: fadeouttime || d.fadeOutTime || 0.5
        });
    }
};

export const SetVolumeMediaPlayer = (
    target: Device,
    newVolume: number,
    mute: boolean = false
) => {
    console.log('SetVolumeMediaPlayer', { target, newVolume, mute });
    const ipc = getIpc();

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
    } else if (target.type === 'remote_ledwall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'volume',
            payload: {
                deviceId: target.id,
                volume: newVolume,
                mute: mute || newVolume === 0
            }
        });
    } else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        videoWallAgentService.sendCommand(d, 'volume', {
            level: mute ? 0 : newVolume
        });
    }
};

export const SetRepeatMediaPlayer = (
    target: Device,
    repeat: boolean
) => {
    console.log('SetRepeatMediaPlayer', { target, repeat });
    const ipc = getIpc();

    if (target.type === 'local_monitor') {
        if (!ipc) return;
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'update',
            payload: {
                loop: repeat
            }
        });
    } else if (target.type === 'remote_ledwall') {
        networkService.sendCommand({
            type: 'MEDIA_CONTROL',
            action: 'toggle_repeat',
            payload: {
                deviceId: target.id,
                repeat: repeat
            }
        });
    } else if (target.type === 'videowall_agent') {
        const d = target as VideoWallAgentDevice;
        videoWallAgentService.sendCommand(d, 'repeat', {
            repeat: repeat
        });
    }
};
