
import dgram from 'node:dgram';
import axios from 'axios';
import os from 'node:os';

interface ScanResult {
    ip: string;
    mac?: string;
    type: 'wled' | 'wiz' | 'VideoWall_agent' | 'unknown';
    name: string;
    version?: string;
    details?: any;
}

interface NetworkInterface {
    subnet: string; // e.g., '192.168.86'
    broadcast: string; // e.g., '192.168.86.255'
    address: string; // e.g. '192.168.86.20'
}

/**
 * Handles network discovery of lighting and control devices using UDP broadcasting
 * and HTTP scanning across detected network interfaces.
 */
export class DeviceScanner {
    // List of detected subnets and broadcast addresses
    private interfaces: NetworkInterface[] = [];

    /**
     * Initializes the scanner by detecting available network interfaces.
     */
    constructor() {
        this.detectInterfaces();
    }

    /**
     * Scans the system's network interfaces for active IPv4 subnets.
     * Identifies subnets, broadcast addresses, and local IP addresses.
     */
    private detectInterfaces() {
        const interfaces = os.networkInterfaces();
        this.interfaces = [];

        // Iterate through all network interface categories (Wi-Fi, Ethernet, etc.)
        for (const name of Object.keys(interfaces)) {
            // Check each address associated with the interface
            for (const iface of interfaces[name] || []) {
                // Test if the address is IPv4 and not the internal loopback (127.0.0.1)
                if (iface.family === 'IPv4' && !iface.internal) {
                    // Extract the subnet by removing the last octet (e.g., 192.168.1.15 -> 192.168.1)
                    const parts = iface.address.split('.');
                    parts.pop();
                    const subnet = parts.join('.');

                    // Add the network profile to the interfaces list
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

    /**
     * Performs a full network scan to find WLED, WiZ, and VideoWall Agent devices.
     * Starts with UDP discovery, followed by an HTTP sweep for WLED devices.
     * @param onProgress Callback function to report scan status and progress percentage.
     * @returns A promise resolving to an array of found devices.
     */
    async scan(onProgress?: (status: string, progress: number, found: number) => void): Promise<ScanResult[]> {
        // Refresh interfaces before starting a new scan
        this.detectInterfaces();

        // Test if any network interfaces were found; if not, exit early
        if (this.interfaces.length === 0) {
            // If onProgress callback is provided, report the error state
            if (onProgress) onProgress('No Network Interfaces Found', 100, 0);
            return [];
        }

        const results: ScanResult[] = [];
        const foundIps = new Set<string>();

        // 1. Scan via UDP Broadcast (Targeting WiZ + Custom Agent)
        // This is fast and reaches multiple devices at once
        if (onProgress) onProgress('Scanning via UDP...', 5, 0);

        const udpResults = await this.scanUdp();
        udpResults.forEach(r => {
            // Test if the device IP is unique before adding to results
            if (!foundIps.has(r.ip)) {
                foundIps.add(r.ip);
                results.push(r);
            }
        });

        // 2. Scan via HTTP (Targeting WLED devices which don't always respond to generic UDP)
        if (onProgress) onProgress('Scanning via HTTP...', 10, results.length);

        const ipsToScan: string[] = [];
        // Populate a list of all possible IPs in /24 subnets (1 to 254)
        for (const iface of this.interfaces) {
            for (let i = 1; i < 255; i++) {
                const ip = `${iface.subnet}.${i}`;
                // Test if the IP has already been discovered via UDP to avoid redundant HTTP requests
                if (!foundIps.has(ip)) {
                    ipsToScan.push(ip);
                }
            }
        }

        const batchSize = 40; // Number of concurrent HTTP requests
        const total = ipsToScan.length;

        // Process IPs in batches to avoid overwhelming the network or OS file handles
        for (let i = 0; i < total; i += batchSize) {
            const batch = ipsToScan.slice(i, i + batchSize);

            // Report progress if a callback is provided
            if (onProgress) {
                // Calculate progress mapped from 10% to 100%
                const percent = 10 + Math.round((i / total) * 90);
                onProgress(`Scanning ${batch[0]}...`, percent, results.length);
            }

            // Perform parallel HTTP checks for WLED info
            const batchResults = await Promise.all(batch.map(ip => this.checkWled(ip)));

            // Filter out null results and duplicates
            batchResults.filter(Boolean).forEach(r => {
                // Test if device was found and is a new IP
                if (r && !foundIps.has(r.ip)) {
                    foundIps.add(r.ip);
                    results.push(r);
                }
            });
        }

        // Finalize progress reporting
        if (onProgress) onProgress('Complete', 100, results.length);

        return results;
    }

    /**
     * Checks if a specific IP belongs to a WLED device by querying its JSON API.
     * @param ip The IP address to check.
     * @returns ScanResult if WLED is detected, otherwise null.
     */
    private async checkWled(ip: string): Promise<ScanResult | null> {
        try {
            // Attempt to fetch device info from the standard WLED endpoint
            const response = await axios.get(`http://${ip}/json/info`, { timeout: 1500 });

            // Test if the response contains characteristic WLED signature fields
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
            // Silently ignore errors (e.g. timeout, connection refused) as they indicate a non-WLED device
        }
        return null;
    }

    /**
     * Discovers WiZ and VideoWall Agent devices via UDP broadcasting.
     * Sends discovery payloads to both global and interface-specific broadcast addresses.
     * @returns A promise resolving to an array of found devices.
     */
    private scanUdp(): Promise<ScanResult[]> {
        return new Promise((resolve) => {
            const socket = dgram.createSocket('udp4');
            const results: ScanResult[] = [];

            // Initialize the socket for broadcasting
            socket.bind(() => {
                socket.setBroadcast(true);

                // WiZ Discovery Payload: Query pilot status to trigger a response
                const wizPayload = JSON.stringify({ method: "getPilot", params: {} });

                // VideoWall Agent Discovery Payload: Trigger custom discovery action
                const agentPayload = JSON.stringify({ action: "discover_agent" });

                // Attempt global broadcast (reaches all devices on the primary network segment)
                try {
                    socket.send(wizPayload, 38899, '255.255.255.255');
                    socket.send(agentPayload, 5566, '255.255.255.255');
                } catch (e) {
                    console.error('UDP Global Broadcast failed', e);
                }

                // Subnet-specific broadcasting: ensures packets reach all configured network segments
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

            // Listen for incoming UDP messages (device responses)
            socket.on('message', (msg, rinfo) => {
                try {
                    const str = msg.toString();
                    const obj = JSON.parse(str);

                    // Test if response matches WiZ lighting format
                    if (obj.result && obj.result.mac) {
                        results.push({
                            ip: rinfo.address,
                            mac: obj.result.mac,
                            type: 'wiz',
                            name: `WiZ Light (${obj.result.mac})`,
                            details: obj
                        });
                    }

                    // Test if response matches VideoWall Agent signature
                    if (obj.type === 'VideoWall_agent_response') {
                        console.log(`[Scanner] Found VideoWall Agent at ${rinfo.address}:`, obj);
                        results.push({
                            ip: rinfo.address,
                            mac: obj.mac,
                            type: 'VideoWall_agent',
                            name: obj.name || 'VideoWall Agent',
                            version: obj.version || '1.0.0', // Capture version
                            details: obj
                        });
                    }

                } catch (e) {
                    // Ignore non-JSON or malformed messages
                }
            });

            // Set a timeout to allow devices enough time to respond (2.5 seconds)
            setTimeout(() => {
                try {
                    socket.close();
                } catch (e) {
                    // Ignore socket close errors
                }
                resolve(results);
            }, 2500);
        });
    }

    /**
     * Lightweight scan that only discovers VideoWall Agents via UDP.
     * Completes in ~2.5 seconds. Used by the setup wizard for fast polling.
     */
    async scanAgentsOnly(): Promise<ScanResult[]> {
        this.detectInterfaces();

        if (this.interfaces.length === 0) {
            return [];
        }

        const udpResults = await this.scanUdp();
        return udpResults.filter(r => r.type === 'VideoWall_agent');
    }
}

export const deviceScanner = new DeviceScanner();
