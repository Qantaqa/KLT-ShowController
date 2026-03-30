import dgram from 'node:dgram';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
export class DiscoveryService {
    socket;
    port = 5566;
    name;
    lastHubIp = null;
    constructor(agentName) {
        this.socket = dgram.createSocket('udp4');
        this.name = agentName || `VideoWall-Agent-${os.hostname()}`;
    }
    start() {
        this.socket.on('error', (err) => {
            console.error(`Discovery Socket error:\n${err.stack}`);
            this.socket.close();
        });
        this.socket.on('message', (msg, rinfo) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.action === 'discover_agent') {
                    console.log(`Discovery request from ${rinfo.address}:${rinfo.port}`);
                    this.lastHubIp = rinfo.address;
                    this.respond(rinfo.address, rinfo.port);
                }
            }
            catch (e) {
                // Ignore non-JSON or invalid messages
            }
        });
        this.socket.on('listening', () => {
            const address = this.socket.address();
            console.log(`Discovery service listening ${address.address}:${address.port}`);
        });
        this.socket.bind(this.port);
    }
    getHubIp() {
        return this.lastHubIp;
    }
    respond(address, port) {
        const mac = this.getMacAddress();
        let version = '1.0.0';
        try {
            const pkgPath = path.join(process.cwd(), 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            version = pkg.version || '1.0.0';
        }
        catch (e) {
            console.error('Error reading package.json for version:', e);
        }
        const response = JSON.stringify({
            type: 'VideoWall_agent_response',
            mac: mac,
            name: this.name,
            version: version,
            model: process.env.AGENT_MODEL || '4-screen',
            layout: process.env.AGENT_LAYOUT || '2x2',
            orientation: process.env.AGENT_ORIENTATION || 'landscape',
            port: parseInt(process.env.AGENT_PORT || '3003')
        });
        this.socket.send(response, port, address, (err) => {
            if (err)
                console.error('Error responding to discovery:', err);
        });
    }
    getMacAddress() {
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
//# sourceMappingURL=discovery.js.map