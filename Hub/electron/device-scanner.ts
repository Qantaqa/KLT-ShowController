
import dgram from 'node:dgram';
import axios from 'axios';
import os from 'node:os';

interface ScanResult {
    ip: string;
    mac?: string;
    type: 'wled' | 'wiz' | 'ledwall_agent' | 'unknown';
    name: string;
    details?: any;
}

interface NetworkInterface {
    subnet: string; // e.g., '192.168.86'
    broadcast: string; // e.g., '192.168.86.255'
    address: string; // e.g. '192.168.86.20'
}

export class DeviceScanner {
    private interfaces: NetworkInterface[] = [];

    constructor() {
        this.detectInterfaces();
    }

    private detectInterfaces() {
        const interfaces = os.networkInterfaces();
        this.interfaces = [];

        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    // Assume /24 subnet for simplicity
                    const parts = iface.address.split('.');
                    parts.pop();
                    const subnet = parts.join('.');
                    this.interfaces.push({
                        subnet,
                        broadcast: `${subnet}.255`,
                        address: iface.address
                    });
                }
            }
        }
        console.log('Detected interfaces:', this.interfaces);
    }

    async scan(onProgress?: (status: string, progress: number, found: number) => void): Promise<ScanResult[]> {
        this.detectInterfaces();

        if (this.interfaces.length === 0) {
            if (onProgress) onProgress('No Network Interfaces Found', 100, 0);
            return [];
        }

        const results: ScanResult[] = [];
        const foundIps = new Set<string>();

        // 1. Scan via UDP Broadcast (WiZ + Custom Agent)
        if (onProgress) onProgress('Scanning via UDP...', 5, 0);

        const udpResults = await this.scanUdp();
        udpResults.forEach(r => {
            if (!foundIps.has(r.ip)) {
                foundIps.add(r.ip);
                results.push(r);
            }
        });

        if (onProgress) onProgress('Scanning via HTTP...', 10, results.length);

        // 2. Scan via HTTP (WLED) - Parallel requests
        const ipsToScan: string[] = [];
        for (const iface of this.interfaces) {
            for (let i = 1; i < 255; i++) {
                const ip = `${iface.subnet}.${i}`;
                if (!foundIps.has(ip)) {
                    ipsToScan.push(ip); // Scan all IPs that weren't found via UDP
                }
            }
        }

        const batchSize = 40; // Increased batch size slightly
        const total = ipsToScan.length;

        for (let i = 0; i < total; i += batchSize) {
            const batch = ipsToScan.slice(i, i + batchSize);

            if (onProgress) {
                // Progress map 10% -> 100%
                const percent = 10 + Math.round((i / total) * 90);
                onProgress(`Scanning ${batch[0]}...`, percent, results.length);
            }

            const batchResults = await Promise.all(batch.map(ip => this.checkWled(ip)));
            batchResults.filter(Boolean).forEach(r => {
                if (r && !foundIps.has(r.ip)) {
                    foundIps.add(r.ip);
                    results.push(r);
                }
            });
        }

        if (onProgress) onProgress('Complete', 100, results.length);

        return results;
    }

    private async checkWled(ip: string): Promise<ScanResult | null> {
        try {
            const response = await axios.get(`http://${ip}/json/info`, { timeout: 1500 });
            if (response.data && response.data.ver && response.data.leds) {
                return {
                    ip,
                    mac: response.data.mac,
                    type: 'wled',
                    name: response.data.name || 'WLED Device',
                    details: response.data
                };
            }
        } catch (e) {
            // Ignore errors (timeouts, connection refused)
        }
        return null;
    }

    private scanUdp(): Promise<ScanResult[]> {
        return new Promise((resolve) => {
            const socket = dgram.createSocket('udp4');
            const results: ScanResult[] = [];

            socket.bind(() => {
                socket.setBroadcast(true);

                // WiZ Discovery Payload
                const wizPayload = JSON.stringify({ method: "getPilot", params: {} });

                // LedWall Agent Discovery Payload
                const agentPayload = JSON.stringify({ action: "discover_agent" });

                // Send to global broadcast
                try {
                    socket.send(wizPayload, 38899, '255.255.255.255');
                    socket.send(agentPayload, 5566, '255.255.255.255');
                } catch (e) {
                    console.error('UDP Global Broadcast failed', e);
                }

                // Send to each subnet broadcast to ensure it reaches all segments
                // (This helps if global broadcast 255.255.255.255 doesn't route to all interfaces)
                for (const iface of this.interfaces) {
                    try {
                        socket.send(wizPayload, 38899, iface.broadcast);
                        socket.send(agentPayload, 5566, iface.broadcast);
                        console.log(`Sending UDP to ${iface.broadcast}`);
                    } catch (e) {
                        console.error(`UDP Broadcast to ${iface.broadcast} failed`, e);
                    }
                }
            });

            socket.on('message', (msg, rinfo) => {
                try {
                    const str = msg.toString();
                    const obj = JSON.parse(str);

                    // WiZ Response
                    if (obj.result && obj.result.mac) {
                        results.push({
                            ip: rinfo.address,
                            mac: obj.result.mac,
                            type: 'wiz',
                            name: `WiZ Light (${obj.result.mac})`,
                            details: obj
                        });
                    }

                    // LedWall Agent Response
                    if (obj.type === 'ledwall_agent_response') {
                        results.push({
                            ip: rinfo.address,
                            mac: obj.mac,
                            type: 'ledwall_agent',
                            name: obj.name || 'LedWall Agent',
                            details: obj
                        });
                    }

                } catch (e) { /* ignore non-JSON */ }
            });

            // Wait 2.5 seconds for responses
            setTimeout(() => {
                try {
                    socket.close();
                } catch (e) { } // Ignore close errors
                resolve(results);
            }, 2500);
        });
    }
}

export const deviceScanner = new DeviceScanner();
