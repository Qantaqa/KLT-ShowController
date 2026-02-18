

import type { Device, LocalMonitorDevice } from '../store/useShowStore';


// Helper to get IPC
const getIpc = () => {
    if ((window as any).require) {
        return (window as any).require('electron').ipcRenderer;
    }
    return null;
}

export const StartMediaPlayer = async (
    target: Device,
    sourcefile: string,
    repeat: boolean,
    volume: number,
    fadeouttime: number,
    previewplayer?: any,
    transitiontime?: number
) => {
    console.log('StartMediaPlayer', { target, sourcefile, repeat, volume, fadeouttime, previewplayer, transitiontime });
    const ipc = getIpc();
    if (!ipc) {
        console.warn('MediaPlayer: No IPC available (not in Electron)');
        return;
    }

    if (target.type === 'local_monitor') {
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
                url: sourcefile,
                loop: repeat,
                volume: volume,
                mute: false,
                transitionTime: transitiontime || 0
            }
        });
    }

    // Handle preview player if provided
    if (previewplayer instanceof HTMLVideoElement) {
        previewplayer.src = sourcefile.startsWith('http') || sourcefile.startsWith('file') || sourcefile.startsWith('ledshow-file')
            ? sourcefile
            : `ledshow-file:///${sourcefile.replace(/\\/g, '/')}`;
        previewplayer.play().catch(err => console.warn('MediaPlayer: Preview play failed', err));
    }

    // TODO: Handle videowall or other targets
};

export const ChangeMediaPlayer = (
    target: Device,
    newSourcefile: string,
    transitiontime: number,
    repeat: boolean,
    volume: number
) => {
    console.log('ChangeMediaPlayer', { target, newSourcefile, transitiontime, repeat, volume });
    const ipc = getIpc();
    if (!ipc) return;

    if (target.type === 'local_monitor') {
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'play',
            payload: {
                url: newSourcefile,
                loop: repeat,
                volume: volume,
                mute: false,
                transitionTime: transitiontime
            }
        });
    }
};

export const StopMediaPlayer = (
    target: Device,
    fadeouttime: number
) => {
    console.log('StopMediaPlayer', { target, fadeouttime });
    const ipc = getIpc();
    if (!ipc) return;

    if (target.type === 'local_monitor') {
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'stop',
            payload: {
                fadeOutTime: fadeouttime
            }
        });
    }
};

export const SetVolumeMediaPlayer = (
    target: Device,
    newVolume: number
) => {
    console.log('SetVolumeMediaPlayer', { target, newVolume });
    const ipc = getIpc();
    if (!ipc) return;

    if (target.type === 'local_monitor') {
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'volume',
            payload: {
                volume: newVolume,
                mute: newVolume === 0
            }
        });
    }
};

export const SetRepeatMediaPlayer = (
    target: Device,
    repeat: boolean
) => {
    console.log('SetRepeatMediaPlayer', { target, repeat });
    const ipc = getIpc();
    if (!ipc) return;

    if (target.type === 'local_monitor') {
        ipc.send('media-command', {
            deviceId: target.id,
            command: 'update',
            payload: {
                loop: repeat
            }
        });
    }
};
