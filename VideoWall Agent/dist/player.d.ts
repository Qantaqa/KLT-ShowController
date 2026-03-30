import { WebSocket } from 'ws';
/**
 * PlayerService — manages connected output display clients.
 *
 * Instead of spawning MPV, we send commands to browser-based
 * output pages connected via WebSocket. This works cross-platform
 * on both Windows and Raspberry Pi.
 */
export declare class PlayerService {
    private outputClients;
    constructor();
    /** Register an output display WebSocket client */
    addOutputClient(ws: WebSocket): void;
    /** Send a command to all connected output clients */
    private broadcast;
    play(filename: string, options?: {
        loop?: boolean;
        volume?: number;
        mute?: boolean;
        fadeInTime?: number;
        crossoverTime?: number;
        brightness?: number;
    }): Promise<void>;
    /** Stop playback on all output displays */
    stop(): Promise<void>;
    /** Pause playback on all output displays */
    pause(): Promise<void>;
    /** Resume playback on all output displays */
    resume(): Promise<void>;
    /** Show the test pattern on all output displays */
    showTestPattern(): Promise<void>;
    /** Set volume (0-100) on all output displays */
    setVolume(level: number): Promise<void>;
    /** Set repeat/loop behavior on all output displays */
    setRepeat(repeat: boolean): void;
    /** Check if any output clients are connected */
    hasOutputClients(): boolean;
    /** Get number of connected output clients */
    getOutputClientCount(): number;
    /** Get the set of output clients for external broadcasting */
    getOutputClients(): Set<WebSocket>;
}
//# sourceMappingURL=player.d.ts.map