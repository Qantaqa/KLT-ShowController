import { PlayerService } from './player.js';
import { DiscoveryService } from './discovery.js';
export declare class ServerService {
    private app;
    private server;
    private wss;
    private player;
    private upload;
    private logs;
    private discovery;
    constructor(player: PlayerService, discovery: DiscoveryService);
    /** Compute MD5 checksum of a file */
    private computeFileChecksum;
    private log;
    private getVersion;
    /** Get the primary non-loopback IPv4 address of this machine */
    private getLocalIp;
    /**
     * Recursively copies files from src to dest, skipping any files whose names
     * are in the protected list. Used during self-update to preserve start scripts.
     */
    private copyExcluding;
    /** Broadcast a message to all output display clients */
    private broadcastToOutputClients;
    private setupRoutes;
    private downloadFile;
    private setupWebSockets;
    private getOutputPageHTML;
    private getStatusPageHTML;
    start(port?: number): void;
}
//# sourceMappingURL=server.d.ts.map