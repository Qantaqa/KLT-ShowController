import type { WiZDevice } from "../types/devices";

/**
 * Service verantwoordelijk voor het aansturen van WiZ lampen via de Electron Main process (UDP).
 * Zorgt voor een abstractielaag tussen de UI en het netwerkprotocol.
 */

/**
 * Adjusts the operational state of a WiZ lamp (on/off, color, brightness).
 * This service acts as a bridge between the React UI and the Electron IPC layer.
 * 
 * @param device The WiZDevice configuration object.
 * @param state Object containing the desired operational parameters.
 * @returns A promise that resolves once the command is dispatched to the background process.
 */
export const SetWizState = async (device: WiZDevice, state: { on?: boolean, r?: number, g?: number, b?: number, dimming?: number, transitionTime?: number }) => {
    // Test if the application is running in the Electron environment (Host mode)
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');

        /**
         * Protocol Normalization:
         * The WiZ UDP protocol expects transition duration in milliseconds.
         * The UI provides this value in seconds, so we perform a 1000x conversion.
         */
        const duration = state.transitionTime !== undefined ? Math.round(state.transitionTime * 1000) : undefined;

        // Dispatch the command to the main process for UDP transmission
        await ipcRenderer.invoke('wiz-command', {
            ip: device.ip,
            method: 'setPilot',
            params: {
                // Determine which parameters to include in the JSON payload
                ...(state.on !== undefined ? { state: state.on } : {}),
                // Clamp RGB values to the standard 0-255 range
                ...(state.r !== undefined ? { r: Math.min(255, Math.max(0, state.r)) } : {}),
                ...(state.g !== undefined ? { g: Math.min(255, Math.max(0, state.g)) } : {}),
                ...(state.b !== undefined ? { b: Math.min(255, Math.max(0, state.b)) } : {}),
                // Clamp dimming to 10-100 (WiZ hardware often fails or strobes below 10%)
                ...(state.dimming !== undefined ? { dimming: Math.min(100, Math.max(10, state.dimming)) } : {}),
                ...(duration !== undefined ? { duration } : {})
            }
        });
    } else {
        // Log a warning if called from an unauthorized environment (e.g. standard browser)
        console.warn("SetWizState invoked outside Electron environment. Hardware control is disabled.");
    }
};

/**
 * Activates a WiZ lamp with a specific brightness level.
 * @param device The WiZ device to control.
 * @param dimming Target brightness (default 100%).
 */
export const TurnOnWiz = async (device: WiZDevice, dimming: number = 100) => {
    // Use the device's default fade-in time or fallback to 0.5s
    const transition = device.fadeInTime || 0.5;
    await SetWizState(device, { on: true, dimming, transitionTime: transition });
};

/**
 * Deactivates a WiZ lamp gracefully.
 * @param device The WiZ device to control.
 */
export const TurnOffWiz = async (device: WiZDevice) => {
    // Use the device's default fade-out time or fallback to 0.5s
    const transition = device.fadeOutTime || 0.5;
    await SetWizState(device, { on: false, transitionTime: transition });
};

/**
 * Sets a specific RGB color and brightness for a WiZ lamp.
 * Effectively turns the lamp 'on' if it was previously off.
 * @param device The WiZ device to control.
 * @param r Red component (0-255).
 * @param g Green component (0-255).
 * @param b Blue component (0-255).
 * @param dimming Brightness level (default 100%).
 */
export const SetWizColor = async (device: WiZDevice, r: number, g: number, b: number, dimming: number = 100) => {
    // Use the standard transition time or fallback to 0.5s
    const transition = device.transitionTime || 0.5;
    await SetWizState(device, { on: true, r, g, b, dimming, transitionTime: transition });
};

/**
 * Queries the hardware for its current operational status (color, brightness, reachability).
 * @param device The WiZ device to query.
 * @returns A promise resolving to the device response object or null if unreachable.
 */
export const GetWizStatus = async (device: WiZDevice) => {
    // Test for Electron environment
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        try {
            // Forward the status request to the main process
            return await ipcRenderer.invoke('wiz-command', {
                ip: device.ip,
                method: 'getPilot',
                params: {}
            });
        } catch (error) {
            // Silently log failures (e.g. device offline) and return null to the UI
            console.error(`Failed to fetch WiZ status for ${device.ip}:`, error);
            return null;
        }
    }
    return null;
};
