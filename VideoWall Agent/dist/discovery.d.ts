export declare class DiscoveryService {
    private socket;
    private port;
    private name;
    private lastHubIp;
    constructor(agentName?: string);
    start(): void;
    getHubIp(): string | null;
    private respond;
    private getMacAddress;
}
//# sourceMappingURL=discovery.d.ts.map