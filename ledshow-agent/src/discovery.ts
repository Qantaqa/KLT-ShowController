import dgram from 'node:dgram';
import os from 'node:os';

export class DiscoveryService {
    private socket: dgram.Socket;
    private port: number = 5566;
    private name: string;

    constructor(agentName?: string) {
        this.socket = dgram.createSocket('udp4');
        this.name = agentName || `LedWall-Agent-${os.hostname()}`;
    }

    public start() {
        this.socket.on('error', (err) => {
            console.error(`Discovery Socket error:\n${err.stack}`);
            this.socket.close();
        });

        this.socket.on('message', (msg, rinfo) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.action === 'discover_agent') {
                    console.log(`Discovery request from ${rinfo.address}:${rinfo.port}`);
                    this.respond(rinfo.address, rinfo.port);
                }
            } catch (e) {
                // Ignore non-JSON or invalid messages
            }
        });

        this.socket.on('listening', () => {
            const address = this.socket.address();
            console.log(`Discovery service listening ${address.address}:${address.port}`);
        });

        this.socket.bind(this.port);
    }

    private respond(address: string, port: number) {
        const mac = this.getMacAddress();
        const response = JSON.stringify({
            type: 'ledwall_agent_response',
            mac: mac,
            name: this.name,
            version: '1.0.0',
            model: process.env.AGENT_MODEL || '4-screen',
            layout: process.env.AGENT_LAYOUT || '2x2',
            orientation: process.env.AGENT_ORIENTATION || 'landscape'
        });

        this.socket.send(response, port, address, (err) => {
            if (err) console.error('Error responding to discovery:', err);
        });
    }

    private getMacAddress(): string {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                    return iface.mac;
                }
            }
        }
        return 'unknown';
    }
}
