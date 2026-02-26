import { type StateCreator } from 'zustand';
import { type Device } from '../../types/devices';
import { type ShowState } from '../types';
import { type TransferState } from '../../services/videowall-agent-service';

export interface DeviceSlice {
    deviceAvailability: Record<string, {
        id: string;
        status: 'online' | 'offline' | 'error';
        lastSeen: number;
    }>;
    /** Active media transfers to remote agents */
    activeTransfers: Record<string, TransferState>;
    setDeviceAvailability: (statuses: Record<string, any>) => void;
    setTransferProgress: (transferKey: string, state: TransferState) => void;
    clearTransfer: (transferKey: string) => void;
    addDevice: (device: Device) => Promise<void>;
    updateDevice: (id: string, partial: Partial<Device>) => Promise<void>;
    deleteDevice: (id: string) => Promise<void>;
}

export const createDeviceSlice: StateCreator<
    ShowState,
    [],
    [],
    DeviceSlice
> = (set, get) => ({
    deviceAvailability: {},
    activeTransfers: {},

    setDeviceAvailability: (statuses: Record<string, any>) => {
        set({ deviceAvailability: statuses });
    },

    setTransferProgress: (transferKey: string, state: TransferState) => {
        set((prev) => ({
            activeTransfers: { ...prev.activeTransfers, [transferKey]: state }
        }));
        // Auto-clear completed/skipped transfers after a delay
        if (state.status === 'complete' || state.status === 'skipped') {
            setTimeout(() => {
                get().clearTransfer(transferKey);
            }, 3000);
        }
    },

    clearTransfer: (transferKey: string) => {
        set((prev) => {
            const next = { ...prev.activeTransfers };
            delete next[transferKey];
            return { activeTransfers: next };
        });
    },

    addDevice: async (device) => {
        console.log('[addDevice] Starting with device:', JSON.stringify(device));
        const { appSettings, addToast, broadcastState, updateAppSettings } = get()
        const devices = [...(appSettings.devices || []), device]
        console.log('[addDevice] New devices array length:', devices.length);

        // Update local state first (via appSettings update logic)
        await updateAppSettings({ devices })
        console.log('[addDevice] Zustand state updated. Current devices:', get().appSettings.devices?.length);

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices })
                console.log('[addDevice] DB save successful for', devices.length, 'devices');
            } catch (error: any) {
                console.error('[addDevice] DB save FAILED:', error)
                addToast(`Fout bij toevoegen apparaat: ${error.message || 'Onbekende fout'}`, 'error')
            }
        }
        broadcastState()
        console.log('[addDevice] Complete.');
    },

    updateDevice: async (id, partial) => {
        const { appSettings, addToast, broadcastState, updateAppSettings } = get()
        const devices = (appSettings.devices || []).map(d =>
            d.id === id ? { ...d, ...partial } as Device : d
        )

        await updateAppSettings({ devices })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices })
            } catch (error: any) {
                console.error('Failed to update device:', error)
                addToast(`Fout bij bijwerken apparaat: ${error.message || 'Onbekende fout'}`, 'error')
            }
        }
        broadcastState()
    },

    deleteDevice: async (id) => {
        const { appSettings, addToast, broadcastState, updateAppSettings } = get()
        const devices = (appSettings.devices || []).filter(d => d.id !== id)

        await updateAppSettings({ devices })

        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron')
            try {
                await ipcRenderer.invoke('db:save-devices', { showId: 'GLOBAL', devices })
            } catch (error: any) {
                console.error('Failed to delete device:', error)
                addToast(`Fout bij verwijderen apparaat: ${error.message || 'Onbekende fout'}`, 'error')
            }
        }
        broadcastState()
    },
});
