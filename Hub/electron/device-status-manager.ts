import axios from 'axios';
import dgram from 'node:dgram';
import { dbManager } from './db-manager';
import { screen } from 'electron';

export interface DeviceStatus {
    id: string;
    status: 'online' | 'offline' | 'error';
    lastSeen: number;
}

export class DeviceStatusManager {
    private io: any;
    private interval: NodeJS.Timeout | null = null;
    private statuses: Record<string, DeviceStatus> = {};

    constructor(io: any) {
        this.io = io;
    }

    start(intervalMs: number = 10000) {
        this.checkAll();
        this.interval = setInterval(() => this.checkAll(), intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async checkAll() {
        // Fetch devices directly from the GLOBAL devices table
        const devices = dbManager.getDevices('GLOBAL').filter((d: any) => d.enabled);

        if (devices.length === 0) {
            // If no devices are configured yet, just broadcast empty or skip
            console.log('[StatusManager] No enabled devices found in GLOBAL table.');
        }

        const checks = devices.map((device: any) => this.checkDevice(device));
        await Promise.all(checks);

        // Also check local displays
        const displaysCount = screen.getAllDisplays().length;
        devices.forEach((d: any) => {
            if (d.type === 'local_monitor') {
                const monitorIdx = (d as any).monitorId; // This is the index (0, 1, 2)
                const isFound = monitorIdx >= 0 && monitorIdx < displaysCount;
                this.updateStatus(d.id, isFound ? 'online' : 'offline');
            }
        });

        // Debug: Log statuses count and IDs
        const onlineIds = Object.entries(this.statuses).filter(([_, s]) => s.status === 'online').map(([id, _]) => id);
        console.log(`[StatusManager] Checked ${devices.length} devices. Online count: ${onlineIds.length}. Online IDs: ${onlineIds.join(', ')}`);

        this.broadcast();
    }

    private async checkDevice(device: any) {
        if (device.type === 'wled') {
            try {
                await axios.get(`http://${device.ip}/json/info`, { timeout: 2000 });
                this.updateStatus(device.id, 'online');
            } catch (e) {
                this.updateStatus(device.id, 'offline');
            }
        } else if (device.type === 'wiz') {
            const status = await this.pingWiz(device.ip);
            this.updateStatus(device.id, status ? 'online' : 'offline');
        } else if (device.type === 'remote_ledwall' || device.type === 'videowall_agent') {
            const status = await this.pingAgent(device.ip, device.port || 5566);
            this.updateStatus(device.id, status ? 'online' : 'offline');
        }
    }

    private updateStatus(id: string, status: 'online' | 'offline' | 'error') {
        this.statuses[id] = {
            id,
            status,
            lastSeen: Date.now()
        };
    }

    private broadcast() {
        this.io.emit('execute', {
            type: 'DEVICE_STATUS_UPDATE',
            statuses: this.statuses
        });
    }

    private pingWiz(ip: string): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = dgram.createSocket('udp4');
            const msg = JSON.stringify({ method: "getPilot", params: {} });

            socket.send(msg, 38899, ip, (err) => {
                if (err) {
                    socket.close();
                    resolve(false);
                }
            });

            const timeout = setTimeout(() => {
                socket.close();
                resolve(false);
            }, 1500);

            socket.on('message', () => {
                clearTimeout(timeout);
                socket.close();
                resolve(true);
            });
        });
    }

    private async pingAgent(ip: string, port: number): Promise<boolean> {
        try {
            // Most agents respond to a simple heartbeat or discovery on their port
            // For now, assume a simple TCP/UDP check or specialized agent ping
            // Let's use a simple UDP 'discover' if it's our agent
            return new Promise((resolve) => {
                const socket = dgram.createSocket('udp4');
                const msg = JSON.stringify({ action: "discover_agent" });
                socket.send(msg, port, ip, (err) => {
                    if (err) { resolve(false); socket.close(); }
                });
                const t = setTimeout(() => { resolve(false); socket.close(); }, 1500);
                socket.on('message', () => { clearTimeout(t); resolve(true); socket.close(); });
            });
        } catch (e) {
            return false;
        }
    }
}
