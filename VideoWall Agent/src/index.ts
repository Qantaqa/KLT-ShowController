import { DiscoveryService } from './discovery.js';
import { PlayerService } from './player.js';
import { ServerService } from './server.js';
import path from 'node:path';
import fs from 'node:fs';
import open from 'open';
import dgram from 'node:dgram';
import os from 'node:os';

const AGENT_PORT = parseInt(process.env.AGENT_PORT || '3003');
const AGENT_NAME = process.env.AGENT_NAME || undefined;

async function bootstrap() {
    console.log('--- LedShow VideoWall Agent Starting ---');

    // Ensure media directory exists
    const mediaDir = path.join(process.cwd(), 'media');
    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir);
    }

    // Initialize services
    const player = new PlayerService();

    const discovery = new DiscoveryService(AGENT_NAME);
    const server = new ServerService(player, discovery);

    // Start services
    discovery.start();
    server.start(AGENT_PORT);

    // Open the output display in kiosk mode
    const outputUrl = `http://localhost:${AGENT_PORT}/output`;
    const userDataDir = path.join(process.cwd(), 'browser-profile');

    console.log(`Opening output display at ${outputUrl} (Kiosk Mode)`);

    try {
        const platform = process.platform;
        if (platform === 'win32') {
            const chromeArgs = [
                '--kiosk',
                '--disable-infobars',
                '--disable-session-crashed-bubble',
                '--autoplay-policy=no-user-gesture-required',
                `--user-data-dir=${userDataDir}`
            ];

            console.log('Attempting to launch Chrome in kiosk mode...');
            await open(outputUrl, {
                app: { name: 'chrome', arguments: chromeArgs }
            }).catch(async (err) => {
                console.warn('Chrome failed, trying Edge...', err.message);
                await open(outputUrl, {
                    app: { name: 'msedge', arguments: ['--kiosk', '--disable-infobars', '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${userDataDir}`] }
                }).catch(async () => {
                    console.warn('Edge failed, falling back to default browser.');
                    await open(outputUrl);
                });
            });
        } else {
            // Linux / Raspberry Pi: use chromium-browser in kiosk mode
            // --user-data-dir        → dedicated profile, prevents restoring old sessions
            // --no-restore-last-session → don't reopen tabs from last run (prevents console reopening)
            // --password-store=basic → suppress keychain popup on Linux desktop environments
            console.log('Attempting to launch Chromium-browser in kiosk mode...');
            const linuxArgs = [
                '--kiosk',
                '--disable-infobars',
                '--noerrdialogs',
                '--autoplay-policy=no-user-gesture-required',
                '--no-restore-last-session',
                '--disable-session-crashed-bubble',
                '--password-store=basic',
                `--user-data-dir=${userDataDir}`,
            ];
            await open(outputUrl, {
                app: { name: 'chromium-browser', arguments: linuxArgs }
            }).catch(async () => {
                // Fallback: try 'chromium' binary name (some distros)
                await open(outputUrl, {
                    app: { name: 'chromium', arguments: linuxArgs }
                }).catch(async () => {
                    await open(outputUrl);
                });
            });
        }
    } catch (err) {
        console.error('Failed to open output browser:', err);
        console.log(`Please manually open: ${outputUrl}`);
    }

    const statusUrl = `http://localhost:${AGENT_PORT}`;
    console.log(`Status dashboard at ${statusUrl} (open dit adres op een ander apparaat)`);

    console.log('--- Agent Ready ---');

    // Announce our presence to any listening Hub on the network via UDP
    setTimeout(() => announceToHub(AGENT_PORT), 3000);
    setInterval(() => announceToHub(AGENT_PORT), 30000);

    // Schedule startup version check — wait 8s so discovery can learn the Hub IP
    setTimeout(() => checkForUpdate(discovery, AGENT_PORT), 8000);
}

/**
 * Broadcasts agent presence via UDP so the Hub's DeviceScanner can auto-discover it.
 * Uses the same port (5566) and response format as the standard discovery protocol.
 * The hub's scanner already processes 'VideoWall_agent_response' messages.
 */
function announceToHub(agentPort: number): void {
    const socket = dgram.createSocket('udp4');

    let version = '1.0.0';
    try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        version = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version || '1.0.0';
    } catch (_) { }

    const mac = (() => {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (!iface.internal && iface.mac !== '00:00:00:00:00:00') return iface.mac;
            }
        }
        return 'unknown';
    })();

    const message = JSON.stringify({
        type: 'VideoWall_agent_response',
        mac,
        name: AGENT_NAME || `VideoWall-Agent-${os.hostname()}`,
        version,
        model: process.env.AGENT_MODEL || '4-screen',
        layout: process.env.AGENT_LAYOUT || '2x2',
        orientation: process.env.AGENT_ORIENTATION || 'landscape',
        port: agentPort
    });

    const buf = Buffer.from(message);

    socket.bind(() => {
        socket.setBroadcast(true);
        // Broadcast to both global and subnet-specific addresses
        const broadcastAddresses = ['255.255.255.255'];
        const ifaces = os.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
            for (const iface of ifaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const parts = iface.address.split('.');
                    parts[3] = '255';
                    broadcastAddresses.push(parts.join('.'));
                }
            }
        }

        let sent = 0;
        for (const addr of broadcastAddresses) {
            socket.send(buf, 5566, addr, (err) => {
                if (err) console.warn(`[Announce] Broadcast to ${addr} failed:`, err.message);
                else console.log(`[Announce] Broadcast naar hub op ${addr}:5566`);
                sent++;
                if (sent === broadcastAddresses.length) {
                    try { socket.close(); } catch (_) { }
                }
            });
        }
    });
}

/**
 * Checks the Hub for a newer agent version and triggers a self-update if available.
 * Hub IP is learned via UDP discovery broadcast.
 * Hub file server port is Hub socket port + 1 (default 3002).
 */
async function checkForUpdate(discovery: DiscoveryService, agentPort: number): Promise<void> {
    const hubIp = discovery.getHubIp();
    if (!hubIp) {
        console.log('[Update] Geen Hub IP gevonden via discovery — nieuwe poging over 30s.');
        setTimeout(() => checkForUpdate(discovery, agentPort), 30000);
        return;
    }

    try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        const localVersion = (JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version || '0.0.0') as string;

        // Hub file server listens on Hub socket port + 1 (default 3001 + 1 = 3002)
        const HUB_FILE_PORT = 3002;
        const versionUrl = `http://${hubIp}:${HUB_FILE_PORT}/agent-version`;

        const response = await fetch(versionUrl, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            console.warn(`[Update] Hub versie-endpoint niet bereikbaar (HTTP ${response.status})`);
            return;
        }

        const { version: remoteVersion } = await response.json() as { version: string };
        console.log(`[Update] Lokale versie: v${localVersion} | Hub versie: v${remoteVersion}`);

        if (remoteVersion > localVersion) {
            console.log(`[Update] Nieuwere versie v${remoteVersion} beschikbaar. Self-update starten...`);
            const updateRes = await fetch(`http://localhost:${agentPort}/trigger-hub-update`, {
                method: 'POST',
                signal: AbortSignal.timeout(10000)
            });
            if (updateRes.ok) {
                console.log('[Update] Update getriggerd, agent herstart binnenkort...');
            } else {
                console.warn('[Update] Update trigger mislukt:', await updateRes.text());
            }
        } else {
            console.log('[Update] Agent is up-to-date.');
        }
    } catch (e: any) {
        console.warn('[Update] Versiecheck mislukt:', e.message);
    }
}

bootstrap().catch(err => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n--- Shutting down agent... ---');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n--- Termination signal received ---');
    process.exit(0);
});
