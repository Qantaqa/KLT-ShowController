import { PlayerService } from './player.js';
export declare class TrayService {
    private systray;
    private player;
    constructor(player: PlayerService);
    start(): Promise<void>;
    stop(): void;
}
//# sourceMappingURL=tray.d.ts.map