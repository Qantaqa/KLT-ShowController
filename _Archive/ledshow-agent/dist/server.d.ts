import { PlayerService } from './player.js';
export declare class ServerService {
    private app;
    private server;
    private wss;
    private player;
    private upload;
    constructor(player: PlayerService);
    private setupRoutes;
    private setupWebSockets;
    start(port?: number): void;
}
//# sourceMappingURL=server.d.ts.map