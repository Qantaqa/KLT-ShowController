import axios from 'axios';
import type { VideoWallAgentDevice } from '../store/useShowStore';

/**
 * Service verantwoordelijk voor de communicatie met externe VideoWall Agents.
 * Beheert WebSocket verbindingen voor real-time commando's en HTTP/IPC voor file-overdracht.
 */
class VideoWallAgentService {
    /**
     * Map van actieve WebSocket verbindingen, geïndexeerd op apparaat-ID.
     * Integriteit: Zorgt dat verbindingen worden hergebruikt en opgeruimd bij verbreking.
     */
    private connections: Map<string, WebSocket> = new Map();

    /**
     * Doel: Beheert en retourneert een WebSocket-verbinding voor een specifiek VideoWall apparaat.
     * Input: device (VideoWallAgentDevice) metadata.
     * Output: Een actieve of nieuwe WebSocket instantie.
     * Condities: Als er geen verbinding is of deze is gesloten, wordt een nieuwe opgezet.
     * Integriteit: Gebruikt 'once' listeners voor opruimen en voorkomt dubbele verbindingen.
     */
    private getSocket(device: VideoWallAgentDevice): WebSocket {
        const id = device.id;
        let ws = this.connections.get(id);

        if (!ws || ws.readyState === WebSocket.CLOSED) {
            const url = `ws://${device.ip}:${device.port || 3000}`;
            console.log(`Connecting to VideoWall Agent at ${url}`);
            ws = new WebSocket(url);

            ws.onopen = () => {
                console.log(`Connected to VideoWall Agent: ${device.name}`);
            };

            ws.onerror = (err) => {
                console.error(`WebSocket error for ${device.name}:`, err);
            };

            ws.onclose = () => {
                console.log(`Disconnected from VideoWall Agent: ${device.name}`);
                this.connections.delete(id);
            };

            this.connections.set(id, ws);
        }

        return ws;
    }

    /**
     * Doel: Verstuurt een actie-commando naar een VideoWall Agent.
     * Input: device (target), action (commando naam), payload (optionele parameters).
     * Output: Void (poging tot versturen).
     * Condities: Controleert 'readyState'. Wacht op 'open' als de verbinding nog wordt opgezet.
     * Integriteit: Foutmelding bij falen en garandeert berichtaflevering via event listener bij CONNECTING state.
     */
    public async sendCommand(device: VideoWallAgentDevice, action: string, payload: any = {}) {
        try {
            const ws = this.getSocket(device);

            const execute = () => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ action, ...payload }));
                } else if (ws.readyState === WebSocket.CONNECTING) {
                    // Wacht op verbinding voor verzenden
                    ws.addEventListener('open', () => {
                        ws.send(JSON.stringify({ action, ...payload }));
                    }, { once: true });
                } else {
                    console.error(`Kan commando '${action}' niet versturen naar ${device.name}: WebSocket status ${ws.readyState}`);
                }
            };

            execute();
        } catch (error) {
            console.error(`Kritieke fout bij sendCommand naar ${device.name}:`, error);
        }
    }

    /**
     * Doel: Uploadt een videobestand naar de VideoWall Agent.
     * Input: device (target), file (Bestandsobject of absoluut pad).
     * Output: Boolean (succes van de operatie).
     * Condities: Gebruikt Electron IPC voor lokale paden of standaard FormData voor Browser Files.
     * Integriteit: Foutafhandeling via try-catch met duidelijke logging bij netwerkfouten.
     */
    public async uploadVideo(device: VideoWallAgentDevice, file: File | string): Promise<boolean> {
        const url = `http://${device.ip}:${device.port || 3000}/upload`;

        try {
            if (typeof file === 'string') {
                // Electron integratie voor directe bestandstoegang via main process
                if ((window as any).require) {
                    const { ipcRenderer } = (window as any).require('electron');
                    const success = await ipcRenderer.invoke('upload-to-agent', {
                        url,
                        filePath: file
                    });
                    return !!success;
                } else {
                    console.warn("Bestandspad opgegeven maar geen Electron omgeving gevonden.");
                    return false;
                }
            } else {
                // Standaard browser upload flow
                const formData = new FormData();
                formData.append('video', file);
                await axios.post(url, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 0 // Verlaag kans op timeout bij grote bestanden
                });
                return true;
            }
        } catch (error) {
            console.error(`Fout bij uploaden naar ${device.name}:`, error);
            return false;
        }
    }

    /**
     * Doel: Haalt de lijst met beschikbare bestanden op van de agent.
     * Input: device (target).
     * Output: Array van bestandsnamen (strings).
     * Condities: Bij netwerkfout wordt een lege array geretourneerd om crashes te voorkomen.
     * Integriteit: Directe HTTP GET request met basis foutafhandeling.
     */
    public async getFiles(device: VideoWallAgentDevice): Promise<string[]> {
        const url = `http://${device.ip}:${device.port || 3000}/files`;
        try {
            const response = await axios.get(url, { timeout: 2000 });
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error(`Fout bij ophalen bestanden van ${device.name}:`, error);
            return [];
        }
    }
}

export const videoWallAgentService = new VideoWallAgentService();
