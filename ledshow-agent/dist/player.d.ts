export declare class PlayerService {
    private mpvPlayer;
    private mediaPath;
    constructor();
    init(): Promise<void>;
    play(filename: string): Promise<void>;
    stop(): Promise<void>;
    setVolume(level: number): Promise<void>;
}
//# sourceMappingURL=player.d.ts.map