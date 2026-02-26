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