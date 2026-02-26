import axios from 'axios';
import dgram from 'node:dgram';
import { dbManager } from './db-manager';
import { screen } from 'electron';

export interface DeviceStatus {
    id: string;
    status: 'online' | 'offline' | 'error';
    lastSeen: number;
}

/**
 * Periodically monitors the availability of configured devices and broadcasts their 
 * online/offline status to connected clients via Socket.io.
 */
export class DeviceStatusManager {
    private io: any; // Socket.io instance for broadcasting
    private interval: NodeJS.Timeout | null = null; // Reference to the polling timer
    private statuses: Record<string, DeviceStatus> = {}; // Local cache of device statuses

    /**
     * @param io The Socket.io server instance.
     */
    constructor(io: any) {
        this.io = io;
    }

    /**
     * Starts the periodic status checking process.
     * @param intervalMs How often to check all devices (default: 10 seconds).
     */
    start(intervalMs: number = 10000) {
        // Immediate check on startup
        this.checkAll();
        // Setup recurring interval
        this.interval = setInterval(() => this.checkAll(), intervalMs);
    }

    /**
     * Stops the periodic status checking process.
     */
    stop() {
        // Test if an interval is currently running; if true, clear it
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Internal method to trigger availability checks for all enabled devices.
     */
    private async checkAll() {
        // Fetch devices from the 'GLOBAL' category and filter only those that are enabled
        const devices = dbManager.getDevices('GLOBAL').filter((d: any) => d.enabled);

        // Test if the device list is empty; if so, log and potentially skip further logic
        if (devices.length === 0) {
            console.log('[StatusManager] No enabled devices found in GLOBAL table.');
        }

        // Trigger individual health checks for all network-based devices in parallel
        const checks = devices.map((device: any) => this.checkDevice(device));
        await Promise.all(checks);

        // Perform specialized checks for local hardware (e.g. attached monitors)
        const displaysCount = screen.getAllDisplays().length;

        devices.forEach((d: any) => {
            // Test if the device represents a local monitor
            if (d.type === 'local_monitor') {
                const monitorIdx = (d as any).monitorId; // Index assigned in configuration
                // Test if the configured index is within the range of currently attached displays
                const isFound = monitorIdx >= 0 && monitorIdx < displaysCount;
                this.updateStatus(d.id, isFound ? 'online' : 'offline');
            }
        });

        // Log online device count for backend diagnostics
        const onlineIds = Object.entries(this.statuses).filter(([_, s]) => s.status === 'online').map(([id, _]) => id);
        /* console.log(`[StatusManager] Checked ${devices.length} devices. Online count: ${onlineIds.length}. Online IDs: ${onlineIds.join(', ')}`); */

        // Emit the bulk status update to all connected web clients
        this.broadcast();
    }

    /**
     * Logic to determine the availability of a single device based on its type.
     * @param device The device configuration object.
     */
    private async checkDevice(device: any) {
        // Test if device is a WLED controller
        if (device.type === 'wled') {
            try {
                // Perform a simple HTTP GET to its info endpoint with a short timeout
                await axios.get(`http://${device.ip}/json/info`, { timeout: 2000 });
                this.updateStatus(device.id, 'online');
            } catch (e) {
                // If the request fails (timeout or REFUSED), mark as offline
                this.updateStatus(device.id, 'offline');
            }
        }
        // Test if device is a WiZ light
        else if (device.type === 'wiz') {
            const status = await this.pingWiz(device.ip);
            this.updateStatus(device.id, status ? 'online' : 'offline');
        }
        // VideoWall Agent or Videowall node: Use UDP discovery port 5566 for health check
        else if (device.type === 'remote_VideoWall' || device.type === 'videowall_agent') {
            const status = await this.pingAgent(device.ip, 5566);
            this.updateStatus(device.id, status ? 'online' : 'offline');
        }
    }

    /**
     * Updates the status of a specific device in the internal cache.
     * @param id The device identifier.
     * @param status The new status value.
     */
    private updateStatus(id: string, status: 'online' | 'offline' | 'error') {
        this.statuses[id] = {
            id,
            status,
            lastSeen: Date.now()
        };
    }

    /**
     * Emits the current statuses of all devices to all connected Socket.io clients.
     */
    private broadcast() {
        this.io.emit('execute', {
            type: 'DEVICE_STATUS_UPDATE',
            statuses: this.statuses
        });
    }

    /**
     * Pings a WiZ device over UDP to check if it's responsive.
     * @param ip The IP address of the WiZ light.
     * @returns A promise resolving to true if a response is received, false otherwise.
     */
    private pingWiz(ip: string): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = dgram.createSocket('udp4');
            // WiZ "getPilot" method serves as a reliable heartbeat query
            const msg = JSON.stringify({ method: "getPilot", params: {} });

            socket.send(msg, 38899, ip, (err) => {
                // Test if the packet sending failed immediately (e.g. invalid network state)
                if (err) {
                    socket.close();
                    resolve(false);
                }
            });

            // Set a timeout to prevent waiting indefinitely for a non-responsive device
            const timeout = setTimeout(() => {
                socket.close();
                resolve(false);
            }, 1500);

            // Listen for a response from the device
            socket.on('message', () => {
                // If any message is received from this IP/port, we consider the device ONLINE
                clearTimeout(timeout);
                socket.close();
                resolve(true);
            });
        });
    }

    /**
     * Pings a custom VideoWall agent using a UDP discovery packet.
     * @param ip The IP address of the agent.
     * @param port The UDP port to ping (default: 5566).
     * @returns A promise resolving to true if the agent responds.
     */
    private async pingAgent(ip: string, port: number): Promise<boolean> {
        try {
            return new Promise((resolve) => {
                const socket = dgram.createSocket('udp4');
                const msg = JSON.stringify({ action: "discover_agent" });

                socket.send(msg, port, ip, (err) => {
                    // Test for immediate send errors
                    if (err) {
                        resolve(false);
                        socket.close();
                    }
                });

                // Set a 1.5s timeout for the agent to respond
                const t = setTimeout(() => {
                    resolve(false);
                    socket.close();
                }, 1500);

                // Wait for any UDP message back from the agent
                socket.on('message', () => {
                    clearTimeout(t);
                    resolve(true);
                    socket.close();
                });
            });
        } catch (e) {
            // General safety catch to ensure the status manager doesn't crash on network errors
            return false;
        }
    }
}
