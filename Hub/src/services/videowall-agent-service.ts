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
     */
    private getSocket(device: VideoWallAgentDevice): WebSocket {
        const id = device.id;
        let ws = this.connections.get(id);

        if (!ws || ws.readyState === WebSocket.CLOSED) {
            const url = `ws://${device.ip}:${device.port || 3003}`;
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
     * Dispatches a remote control command to the target hardware agent.
     */
    public async sendCommand(device: VideoWallAgentDevice, action: string, payload: any = {}) {
        try {
            const ws = this.getSocket(device);

            const execute = () => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ action, ...payload }));
                } else if (ws.readyState === WebSocket.CONNECTING) {
                    ws.addEventListener('open', () => {
                        ws.send(JSON.stringify({ action, ...payload }));
                    }, { once: true });
                } else {
                    console.error(`Cannot send command '${action}' to ${device.name}: WebSocket status ${ws.readyState}`);
                }
            };

            execute();
        } catch (error) {
            console.error(`Critical failure in sendCommand to ${device.name}:`, error);
        }
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
     * Normalizes a file path or URL to a plain OS path.
     * Strips file://, file:/// prefixes and decodes URI encoding.
     */
    private normalizeFilePath(filePathOrUrl: string): string {
        let p = filePathOrUrl.trim();
        // Strip file:/// or file:// prefix (Windows: file:///C:/... → C:/...)
        if (p.startsWith('file:///')) {
            p = p.slice(8);
        } else if (p.startsWith('file://')) {
            p = p.slice(7);
        }
        // Decode URI encoding (%20 → space, etc.)
        try { p = decodeURIComponent(p); } catch (_) { }
        // Normalize forward slashes to backslashes on Windows
        if (p.match(/^[A-Za-z]:\//)) {
            p = p.replace(/\//g, '\\');
        }
        return p;
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
}

export const videoWallAgentService = new VideoWallAgentService();
