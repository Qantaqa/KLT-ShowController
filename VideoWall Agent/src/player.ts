import { WebSocket } from 'ws';

/**
 * PlayerService — manages connected output display clients.
 * 
 * Instead of spawning MPV, we send commands to browser-based
 * output pages connected via WebSocket. This works cross-platform
 * on both Windows and Raspberry Pi.
 */
export class PlayerService {
    private outputClients: Set<WebSocket> = new Set();

    constructor() { }

    /** Register an output display WebSocket client */
    public addOutputClient(ws: WebSocket) {
        this.outputClients.add(ws);
        console.log(`Output client connected (total: ${this.outputClients.size})`);

        ws.on('close', () => {
            this.outputClients.delete(ws);
            console.log(`Output client disconnected (total: ${this.outputClients.size})`);
        });
    }

    /** Send a command to all connected output clients */
    private broadcast(message: object) {
        const data = JSON.stringify(message);
        for (const client of this.outputClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    }

    public async play(filename: string, options?: {
        loop?: boolean;
        volume?: number;
        mute?: boolean;
        fadeInTime?: number;
        crossoverTime?: number;
        brightness?: number;
    }) {
        console.log(`Playing: ${filename} (Brightness: ${options?.brightness ?? 100}%)`);
        this.broadcast({
            action: 'play',
            filename,
            loop: options?.loop ?? false,
            volume: options?.volume ?? 100,
            mute: options?.mute ?? false,
            fadeInTime: options?.fadeInTime ?? 0,
            crossoverTime: options?.crossoverTime ?? 0,
            brightness: options?.brightness ?? 100,
        });
    }

    /** Stop playback on all output displays */
    public async stop() {
        console.log('Stopping playback');
        this.broadcast({ action: 'stop' });
    }

    /** Pause playback on all output displays */
    public async pause() {
        console.log('Pausing playback');
        this.broadcast({ action: 'pause' });
    }

    /** Resume playback on all output displays */
    public async resume() {
        console.log('Resuming playback');
        this.broadcast({ action: 'resume' });
    }

    /** Show the test pattern on all output displays */
    public async showTestPattern() {
        console.log('Showing test pattern');
        this.broadcast({ action: 'test-pattern' });
    }

    /** Set volume (0-100) on all output displays */
    public async setVolume(level: number) {
        console.log(`Setting volume: ${level}`);
        this.broadcast({ action: 'volume', level });
    }

    /** Set repeat/loop behavior on all output displays */
    public setRepeat(repeat: boolean) {
        console.log(`Setting repeat: ${repeat}`);
        this.broadcast({ action: 'repeat', repeat });
    }

    /** Set brightness (0-100+) on all output displays */
    public setBrightness(level: number) {
        console.log(`Setting brightness: ${level}%`);
        this.broadcast({ action: 'brightness', level });
    }

    /** Check if any output clients are connected */
    public hasOutputClients(): boolean {
        return this.outputClients.size > 0;
    }

    /** Get number of connected output clients */
    public getOutputClientCount(): number {
        return this.outputClients.size;
    }

    /** Get the set of output clients for external broadcasting */
    public getOutputClients(): Set<WebSocket> {
        return this.outputClients;
    }
}
