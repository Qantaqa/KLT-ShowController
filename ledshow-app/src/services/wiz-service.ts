import type { WiZDevice } from "../store/useShowStore";

/**
 * Service verantwoordelijk voor het aansturen van WiZ lampen via de Electron Main process (UDP).
 * Zorgt voor een abstractielaag tussen de UI en het netwerkprotocol.
 */

/**
 * Doel: Algemene functie om de status van een WiZ lamp aan te passen.
 * Input: device (WiZDevice), state (on, r, g, b, dimming, transitionTime).
 * Output: Promise<void>.
 * Condities: Werkt alleen binnen een Electron omgeving waar 'ipcRenderer' beschikbaar is.
 * Integriteit: Valideert parameters en converteert transitionTime naar milliseconden voor het protocol.
 */
export const SetWizState = async (device: WiZDevice, state: { on?: boolean, r?: number, g?: number, b?: number, dimming?: number, transitionTime?: number }) => {
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');

        // Protocol specificatie: WiZ verwacht duration in ms, we ontvangen seconds van de UI
        const duration = state.transitionTime !== undefined ? Math.round(state.transitionTime * 1000) : undefined;

        await ipcRenderer.invoke('wiz-command', {
            ip: device.ip,
            method: 'setPilot',
            params: {
                ...(state.on !== undefined ? { state: state.on } : {}),
                ...(state.r !== undefined ? { r: Math.min(255, Math.max(0, state.r)) } : {}),
                ...(state.g !== undefined ? { g: Math.min(255, Math.max(0, state.g)) } : {}),
                ...(state.b !== undefined ? { b: Math.min(255, Math.max(0, state.b)) } : {}),
                ...(state.dimming !== undefined ? { dimming: Math.min(100, Math.max(10, state.dimming)) } : {}), // WiZ minimum is vaak 10
                ...(duration !== undefined ? { duration } : {})
            }
        });
    } else {
        console.warn("SetWizState aangeroepen buiten Electron omgeving.");
    }
};

/**
 * Doel: Zet een WiZ lamp aan met optionele dimming.
 * Input: device, dimming (default 100).
 * Output: Promise<void>.
 * Condities: Gebruikt de 'fadeInTime' van het device als overgangstijd.
 * Integriteit: Delegeert naar SetWizState.
 */
export const TurnOnWiz = async (device: WiZDevice, dimming: number = 100) => {
    const transition = device.fadeInTime || 0.5;
    await SetWizState(device, { on: true, dimming, transitionTime: transition });
};

/**
 * Doel: Zet een WiZ lamp volledig uit.
 * Input: device.
 * Output: Promise<void>.
 * Condities: Gebruikt de 'fadeOutTime' van het device.
 * Integriteit: Delegeert naar SetWizState.
 */
export const TurnOffWiz = async (device: WiZDevice) => {
    const transition = device.fadeOutTime || 0.5;
    await SetWizState(device, { on: false, transitionTime: transition });
};

/**
 * Doel: Stelt een specifieke RGB kleur in voor een WiZ lamp.
 * Input: device, r, g, b, dimming.
 * Output: Promise<void>.
 * Condities: Gebruikt 'transitionTime' van het device.
 * Integriteit: Garandeert dat de lamp ook 'aan' gaat bij een kleurwijziging.
 */
export const SetWizColor = async (device: WiZDevice, r: number, g: number, b: number, dimming: number = 100) => {
    const transition = device.transitionTime || 0.5;
    await SetWizState(device, { on: true, r, g, b, dimming, transitionTime: transition });
};

/**
 * Doel: Haalt de huidige status (kleur, dimming, etc.) op van een WiZ lamp.
 * Input: device.
 * Output: Promise met statusobject of null.
 * Condities: UDP communicatie kan timenouten via NetworkManager.
 * Integriteit: Retourneert null bij falen om crashes in de UI te voorkomen.
 */
export const GetWizStatus = async (device: WiZDevice) => {
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        try {
            return await ipcRenderer.invoke('wiz-command', {
                ip: device.ip,
                method: 'getPilot',
                params: {}
            });
        } catch (error) {
            console.error(`Fout bij ophalen WiZ status voor ${device.ip}:`, error);
            return null;
        }
    }
    return null;
};
