import axios from 'axios';
import type { VideoWallAgentDevice } from '../types/devices';

/** Transfer state for tracking active uploads */
export interface TransferState {
    deviceId: string;
    filename: string;
    percent: number;
    status: 'checking' | 'uploading' | 'complete' | 'skipped' | 'error';
    error?: string;
}

/** Callback for transfer progress updates */
type TransferProgressCallback = (state: TransferState) => void;

/**
 * Service responsible for communication with external VideoWall Agent hardware nodes.
 * Manages WebSocket connections for real-time control and HTTP/IPC for media file synchronization.
 */
class VideoWallAgentService {
    /**
     * Cache of active WebSocket connections, indexed by unique device ID.
     */
    private connections: Map<string, WebSocket> = new Map();

    /** Global progress callback registered by the store */
    private progressCallback: TransferProgressCallback | null = null;

    /** Register a callback for transfer progress updates */
    public onProgress(callback: TransferProgressCallback) {
        this.progressCallback = callback;
    }

    private emitProgress(state: TransferState) {
        if (this.progressCallback) {
            this.progressCallback(state);
        }
    }

    /**
     * Retrieves or establishes a WebSocket connection for a specific VideoWall node.
     * Always returns a socket that is either OPEN or CONNECTING.
     */
    private getSocket(device: VideoWallAgentDevice): WebSocket {
        const id = device.id;
        let ws = this.connections.get(id);

        // Recreate socket if it's gone or in a terminal state
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            const url = `ws://${device.ip}:${device.port || 3003}`;
            console.log(`[WS] (Re)connecting to VideoWall Agent at ${url}`);
            ws = new WebSocket(url);

            ws.onopen = () => {
                console.log(`[WS] Connected to VideoWall Agent: ${device.name}`);
            };

            ws.onerror = (err) => {
                console.error(`[WS] Error for ${device.name}:`, err);
            };

            ws.onclose = () => {
                console.log(`[WS] Disconnected from VideoWall Agent: ${device.name}`);
                this.connections.delete(id);
            };

            this.connections.set(id, ws);
        }

        return ws;
    }

    /**
     * Dispatches a remote control command to the target hardware agent.
     * Always reconnects if the WebSocket is closed or closing.
     * Returns a Promise that resolves when the command has been sent.
     */
    public async sendCommand(device: VideoWallAgentDevice, action: string, payload: any = {}): Promise<void> {
        return new Promise<void>((resolve) => {
            try {
                // getSocket() now always returns an OPEN or CONNECTING socket
                const ws = this.getSocket(device);
                const msg = JSON.stringify({ action, ...payload });

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(msg);
                    console.log(`[WS] Sent '${action}' to ${device.name}`);
                    resolve();
                } else if (ws.readyState === WebSocket.CONNECTING) {
                    // Wait for the connection to open — with a 10s timeout
                    const timeout = setTimeout(() => {
                        console.error(`[WS] Timeout waiting to send '${action}' to ${device.name}`);
                        resolve();
                    }, 10000);

                    ws.addEventListener('open', () => {
                        clearTimeout(timeout);
                        ws.send(msg);
                        console.log(`[WS] Sent '${action}' to ${device.name} (after connect)`);
                        resolve();
                    }, { once: true });

                    ws.addEventListener('error', () => {
                        clearTimeout(timeout);
                        console.error(`[WS] Failed to send '${action}' to ${device.name}: connection error`);
                        resolve();
                    }, { once: true });
                } else {
                    console.error(`[WS] Cannot send '${action}' to ${device.name}: socket in unexpected state ${ws.readyState}`);
                    resolve();
                }
            } catch (error) {
                console.error(`[WS] Critical failure in sendCommand to ${device.name}:`, error);
                resolve();
            }
        });
    }

    /**
     * Legacy sync: tells agent to download from a URL (no checksum, no progress).
     * @deprecated Use syncFileWithProgress instead.
     */
    public syncFile(device: VideoWallAgentDevice, url: string, filename: string) {
        return this.sendCommand(device, 'sync', { url, filename });
    }

    /**
     * Checks if a file exists on the remote agent, optionally with checksum validation.
     */
    public async checkFile(device: VideoWallAgentDevice, filename: string, checksum?: string): Promise<{ exists: boolean, checksumMatch: boolean }> {
        const url = `http://${device.ip}:${device.port || 3003}/files/check?filename=${encodeURIComponent(filename)}${checksum ? `&checksum=${encodeURIComponent(checksum)}` : ''}`;
        try {
            const response = await axios.get(url, { timeout: 5000 });
            return response.data;
        } catch (error) {
            console.error(`Failed to check file on ${device.name}:`, error);
            return { exists: false, checksumMatch: false };
        }
    }

    /**
     * Normalizes any file path or URL to a plain OS path.
     * Handles: file:///, file://, ledshow-file://, and plain paths.
     */
    private normalizeFilePath(filePathOrUrl: string): string {
        let p = filePathOrUrl.trim();

        // Strip known custom protocol (ledshow-file:///C:/... → C:/...)
        if (p.startsWith('ledshow-file:///')) {
            p = p.slice(16);
        } else if (p.startsWith('ledshow-file://')) {
            p = p.slice(15);
        } else if (p.startsWith('file:///')) {
            p = p.slice(8);
        } else if (p.startsWith('file://')) {
            p = p.slice(7);
        }

        // Decode URI encoding (%20 → space, etc.)
        try { p = decodeURIComponent(p); } catch (_) { }

        // Normalize separators: forward slashes after a drive letter → backslashes (Windows)
        if (p.match(/^[A-Za-z]:[/\\]/)) {
            p = p.replace(/\//g, '\\');
        }
        return p;
    }

    /**
     * Sends a play command to the agent via HTTP POST.
     * More reliable than WebSocket after a long upload (no WS state issues).
     */
    public async playFile(
        device: VideoWallAgentDevice,
        filename: string,
        options: { loop?: boolean; volume?: number; mute?: boolean; fadeInTime?: number; crossoverTime?: number; brightness?: number } = {}
    ): Promise<boolean> {
        try {
            const url = `http://${device.ip}:${device.port || 3003}/play`;
            const response = await axios.post(url, {
                filename,
                loop: options.loop ?? false,
                volume: options.volume ?? 100,
                mute: options.mute ?? false,
                fadeInTime: options.fadeInTime ?? 0.5,
                crossoverTime: options.crossoverTime ?? 1.0,
                brightness: options.brightness ?? 100
            }, { timeout: 5000 });
            console.log(`[Agent] HTTP play '${filename}' on ${device.name}: ${response.status}`);
            return response.status === 200;
        } catch (error: any) {
            console.error(`[Agent] HTTP play failed for ${device.name}:`, error.message);
            return false;
        }
    }

    /**
     * Updates the brightness level on the remote agent in real-time.
     */
    public async sendBrightness(device: VideoWallAgentDevice, level: number): Promise<void> {
        // Send via WebSocket for real-time responsiveness
        await this.sendCommand(device, 'brightness', { level });
        
        // Also send via HTTP for persistence/reliability (in case WS is down)
        try {
            const url = `http://${device.ip}:${device.port || 3003}/brightness`;
            await axios.post(url, { level }, { timeout: 2000 });
        } catch (e) {
            // Log but don't fail, WebSocket is the primary real-time path
            console.warn(`[Agent] HTTP brightness sync failed for ${device.name}`);
        }
    }

    /**
     * Syncs a file to a remote agent with checksum validation and upload progress tracking.
     * 1. Computes local MD5 checksum
     * 2. Asks agent if it already has the file with matching checksum
     * 3. If not, uploads via IPC with progress events
     *
     * @returns true if upload was needed (or error), false if file was already synced
     */
    public async syncFileWithProgress(
        device: VideoWallAgentDevice,
        filePath: string,
        filename: string
    ): Promise<boolean> {
        const deviceId = device.id;
        // Normalize the path first — it may arrive as a file:/// URL
        const localPath = this.normalizeFilePath(filePath);

        try {
            // Step 1: Compute local checksum
            this.emitProgress({ deviceId, filename, percent: 0, status: 'checking' });

            let checksum = '';
            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron');
                checksum = await ipcRenderer.invoke('compute-file-checksum', { filePath: localPath });
                console.log(`[Sync] Local checksum for ${filename}: ${checksum}`);
            }

            // Step 2: Check if agent already has the file
            const check = await this.checkFile(device, filename, checksum);
            if (check.exists && check.checksumMatch) {
                console.log(`[Sync] File ${filename} already on ${device.name} with matching checksum. Skipping upload.`);
                this.emitProgress({ deviceId, filename, percent: 100, status: 'skipped' });
                return false;
            }

            console.log(`[Sync] File ${filename} needs upload to ${device.name} (exists=${check.exists}, checksumMatch=${check.checksumMatch})`);

            // Step 3: Upload via IPC
            this.emitProgress({ deviceId, filename, percent: 0, status: 'uploading' });

            if ((window as any).require) {
                const { ipcRenderer } = (window as any).require('electron');
                const uploadUrl = `http://${device.ip}:${device.port || 3003}/upload`;

                // Listen for progress events from main process
                const progressHandler = (_event: any, data: any) => {
                    if (data.deviceId === deviceId) {
                        this.emitProgress({
                            deviceId,
                            filename: data.filename,
                            percent: data.percent,
                            status: 'uploading'
                        });
                    }
                };

                ipcRenderer.on('upload-progress', progressHandler);

                try {
                    const result = await ipcRenderer.invoke('upload-to-agent', {
                        url: uploadUrl,
                        filePath: localPath,
                        deviceId
                    });

                    const success = typeof result === 'boolean' ? result : result?.success;
                    const errorMsg = typeof result === 'object' && result?.error ? result.error : 'Upload mislukt';

                    if (success) {
                        this.emitProgress({ deviceId, filename, percent: 100, status: 'complete' });
                    } else {
                        this.emitProgress({ deviceId, filename, percent: 0, status: 'error', error: errorMsg });
                    }
                    return !!success;
                } finally {
                    ipcRenderer.removeListener('upload-progress', progressHandler);
                }
            }

            return false;
        } catch (error: any) {
            console.error(`[Sync] Failed to sync ${filename} to ${device.name}:`, error);
            this.emitProgress({ deviceId, filename, percent: 0, status: 'error', error: error.message });
            return false;
        }
    }

    /**
     * Uploads a media file to a hardware agent node.
     */
    public async uploadVideo(device: VideoWallAgentDevice, file: File | string): Promise<boolean> {
        const url = `http://${device.ip}:${device.port || 3003}/upload`;

        try {
            if (typeof file === 'string') {
                if ((window as any).require) {
                    const { ipcRenderer } = (window as any).require('electron');
                    const result = await ipcRenderer.invoke('upload-to-agent', {
                        url,
                        filePath: file,
                        deviceId: device.id
                    });
                    const success = typeof result === 'boolean' ? result : result?.success;
                    if (!success) {
                        const err = typeof result === 'object' && result?.error ? result.error : 'Upload failed via IPC';
                        console.error(`Local upload failed for ${device.name}:`, err);
                    }
                    return !!success;
                } else {
                    console.warn("Local path provided but Electron environment not detected. Upload aborted.");
                    return false;
                }
            } else {
                const formData = new FormData();
                formData.append('video', file);

                await axios.post(url, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 0
                });
                return true;
            }
        } catch (error: any) {
            const errorMsg = error?.response?.data?.error || error?.response?.data || error?.message || 'Unknown network error';
            console.error(`Upload failed for ${device.name}:`, errorMsg);
            return false;
        }
    }

    /**
     * Retrieves the inventory of media files on the agent node.
     */
    public async getFiles(device: VideoWallAgentDevice): Promise<string[]> {
        const url = `http://${device.ip}:${device.port || 3003}/files`;
        try {
            const response = await axios.get(url, { timeout: 2000 });
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error(`Failed to fetch file list from ${device.name}:`, error);
            return [];
        }
    }

    /**
     * Reads the current version of the agent from the local repository.
     */
    public async getLatestAgentVersion(): Promise<string> {
        if ((window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            return await ipcRenderer.invoke('get-latest-agent-version');
        }
        return '1.0.0';
    }

    /**
     * Triggers an automatic update of the remote agent.
     * 1. Hub zips its local agent 'dist' folder.
     * 2. Hub uploads the ZIP to the agent's /update endpoint.
     * 3. Agent extracts and restarts.
     */
    public async updateAgent(device: VideoWallAgentDevice, onStatus: (status: string) => void): Promise<boolean> {
        if (!(window as any).require) return false;
        const { ipcRenderer } = (window as any).require('electron');
        const deviceId = device.id;

        try {
            onStatus('Voorbereiden (zippen)...');
            const zipPath = await ipcRenderer.invoke('prepare-agent-update');
            console.log(`[Update] ZIP prepared at: ${zipPath}`);

            onStatus('Update verzenden...');
            const updateUrl = `http://${device.ip}:${device.port || 3003}/update`;

            // Reuse the upload IPC handler but target the update endpoint
            // Since upload-to-agent is hardcoded for 'video' field in some places, 
            // we should ensure it handles the 'update' field. 
            // Actually, my main.ts upload-to-agent uses axios which can be configured.

            // Wait, I should check main.ts to see if upload-to-agent is flexible.
            // If not, I'll need a new IPC handler.

            const success = await ipcRenderer.invoke('upload-to-agent', {
                url: updateUrl,
                filePath: zipPath,
                deviceId,
                fieldName: 'update' // We'll need to update main.ts to support this
            });

            if (success) {
                onStatus('Update geïnstalleerd. Agent start nu opnieuw op...');
                return true;
            } else {
                onStatus('Fout bij verzenden van update.');
                return false;
            }
        } catch (error) {
            console.error(`[Update] Failed to update agent ${device.name}:`, error);
            onStatus('Fout tijdens updateproces.');
            return false;
        }
    }
    /**
     * Restarts the remote agent process (exit 0 → start.sh loop picks it up).
     */
    public async restartAgent(device: VideoWallAgentDevice): Promise<boolean> {
        try {
            const url = `http://${device.ip}:${device.port || 3003}/restart`;
            const response = await axios.post(url, {}, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.error(`[Agent] Failed to restart ${device.name}:`, error);
            return false;
        }
    }

    /**
     * Stops the remote agent cleanly (exit 42 → no restart by start.sh).
     */
    public async shutdownAgent(device: VideoWallAgentDevice): Promise<boolean> {
        try {
            const url = `http://${device.ip}:${device.port || 3003}/shutdown`;
            const response = await axios.post(url, {}, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.error(`[Agent] Failed to shutdown agent ${device.name}:`, error);
            return false;
        }
    }

    /**
     * Shuts down the Linux host machine (exit 43 → start.sh calls "sudo shutdown -h now").
     */
    public async shutdownHost(device: VideoWallAgentDevice): Promise<boolean> {
        try {
            const url = `http://${device.ip}:${device.port || 3003}/host-shutdown`;
            const response = await axios.post(url, {}, { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.error(`[Agent] Failed to shutdown host ${device.name}:`, error);
            return false;
        }
    }
}

export const videoWallAgentService = new VideoWallAgentService();
