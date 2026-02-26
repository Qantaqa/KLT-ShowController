import { WebSocket } from 'ws';
/**
 * PlayerService — manages connected output display clients.
 *
 * Instead of spawning MPV, we send commands to browser-based
 * output pages connected via WebSocket. This works cross-platform
 * on both Windows and Raspberry Pi.
 */
export class PlayerService {
    outputClients = new Set();
    constructor() { }
    /** Register an output display WebSocket client */
    addOutputClient(ws) {
        this.outputClients.add(ws);
        console.log(`Output client connected (total: ${this.outputClients.size})`);
        ws.on('close', () => {
            this.outputClients.delete(ws);
            console.log(`Output client disconnected (total: ${this.outputClients.size})`);
        });
    }
    /** Send a command to all connected output clients */
    broadcast(message) {
        const data = JSON.stringify(message);
        for (const client of this.outputClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    }
    /** Play a media file on all output displays */
    async play(filename, options) {
        console.log(`Playing: ${filename}`);
        this.broadcast({
            action: 'play',
            filename,
            loop: options?.loop ?? false,
            volume: options?.volume ?? 100,
            mute: options?.mute ?? false,
            fadeInTime: options?.fadeInTime ?? 0,
            crossoverTime: options?.crossoverTime ?? 0,
        });
    }
    /** Stop playback on all output displays */
    async stop() {
        console.log('Stopping playback');
        this.broadcast({ action: 'stop' });
    }
    /** Pause playback on all output displays */
    async pause() {
        console.log('Pausing playback');
        this.broadcast({ action: 'pause' });
    }
    /** Resume playback on all output displays */
    async resume() {
        console.log('Resuming playback');
        this.broadcast({ action: 'resume' });
    }
    /** Show the test pattern on all output displays */
    async showTestPattern() {
        console.log('Showing test pattern');
        this.broadcast({ action: 'test-pattern' });
    }
    /** Set volume (0-100) on all output displays */
    async setVolume(level) {
        console.log(`Setting volume: ${level}`);
        this.broadcast({ action: 'volume', level });
    }
    /** Set repeat/loop behavior on all output displays */
    setRepeat(repeat) {
        console.log(`Setting repeat: ${repeat}`);
        this.broadcast({ action: 'repeat', repeat });
    }
    /** Check if any output clients are connected */
    hasOutputClients() {
        return this.outputClients.size > 0;
    }
    /** Get number of connected output clients */
    getOutputClientCount() {
        return this.outputClients.size;
    }
    /** Get the set of output clients for external broadcasting */
    getOutputClients() {
        return this.outputClients;
    }
}
//# sourceMappingURL=player.js.map