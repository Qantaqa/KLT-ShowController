import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { networkManager } from './network-manager';
import { dbManager } from './db-manager';
import { deviceScanner } from './device-scanner';
import { parsePdfScript } from './script-parser';
import { DeviceStatusManager } from './device-status-manager';

const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain, dialog, protocol, screen, net } = require('electron');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('node:fs');
const axios = require('axios');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read port from settings early so it's available everywhere
const _initSettings = dbManager.getAppSettings();
const SOCKET_PORT: number = _initSettings?.serverPort || 3001;
const FILE_PORT: number = SOCKET_PORT + 1; // Separate port for file serving (logo, PDFs)

// Socket.io Server Setup (dedicated server, no HTTP file handling)
const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Start Device Status Monitoring
const statusManager = new DeviceStatusManager(io);
statusManager.start(5000); // Check every 5s

// Separate HTTP file server for logo and PDF serving
const fileServer = http.createServer((req: any, res: any) => {
    if (!req.url) { res.writeHead(400); res.end(); return; }

    let url: URL;
    try { url = new URL(req.url, `http://localhost`); }
    catch { res.writeHead(400); res.end('Bad request'); return; }

    // Serve the app logo
    if (url.pathname === '/logo') {
        const logoPath = path.join(app.getPath('userData'), 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
            res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
            fs.createReadStream(logoPath).pipe(res);
        } else {
            res.writeHead(404); res.end('No logo');
        }
        return;
    }

    // Serve script PDFs
    if (url.pathname === '/script') {
        const filePath = url.searchParams.get('path');
        if (filePath && fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'application/pdf', 'Access-Control-Allow-Origin': '*' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404); res.end('Not found');
        }
        return;
    }

    // Serve Agent Setup Portal
    if (url.pathname === '/setup') {
        let setupPath = path.join(__dirname, './setup-portal.html');
        if (!fs.existsSync(setupPath)) {
            setupPath = path.join(__dirname, '../electron/setup-portal.html'); // Fallback for dev
        }

        if (fs.existsSync(setupPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
            fs.createReadStream(setupPath).pipe(res);
        } else {
            console.error('[Main] Setup portal not found at:', setupPath);
            res.writeHead(404); res.end('Setup portal not found');
        }
        return;
    }

    // Serve Agent Package
    if (url.pathname === '/agent-package') {
        let zipPath = path.join(__dirname, './ledshow-agent.zip');
        if (!fs.existsSync(zipPath)) {
            zipPath = path.join(__dirname, '../electron/ledshow-agent.zip'); // Fallback for dev
        }

        if (fs.existsSync(zipPath)) {
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': 'attachment; filename="ledshow-agent.zip"'
            });
            fs.createReadStream(zipPath).pipe(res);
        } else {
            console.error('[Main] Agent package not found at:', zipPath);
            res.writeHead(404); res.end('Agent package not found');
        }
        return;
    }

    // Serve WLED Effect Previews
    if (url.pathname.startsWith('/wled/effects/')) {
        const effectId = url.pathname.split('/').pop()?.replace('.gif', '');
        if (effectId) {
            // Try different naming conventions FX_0, FX_00, FX_000
            const paddedId = effectId.padStart(3, '0');
            const projectRoot = path.join(__dirname, '../../');
            const possiblePaths = [
                path.join(projectRoot, 'database', 'Effects', `FX_${effectId}.gif`),
                path.join(projectRoot, 'database', 'Effects', `FX_${paddedId}.gif`),
                path.join(projectRoot, 'database', 'Effects', `FX_${effectId.padStart(2, '0')}.gif`)
            ];

            const foundPath = possiblePaths.find(p => fs.existsSync(p));
            if (foundPath) {
                res.writeHead(200, { 'Content-Type': 'image/gif', 'Access-Control-Allow-Origin': '*' });
                fs.createReadStream(foundPath).pipe(res);
                return;
            }
        }
        res.writeHead(404); res.end('Effect preview not found');
        return;
    }

    // Serve WLED Palette Previews
    if (url.pathname.startsWith('/wled/palettes/')) {
        const paletteId = url.pathname.split('/').pop()?.replace('.gif', '');
        if (paletteId) {
            const paddedId = paletteId.padStart(2, '0');
            const projectRoot = path.join(__dirname, '../../');
            const possiblePaths = [
                path.join(projectRoot, 'database', 'Palettes', `PAL_${paletteId}.gif`),
                path.join(projectRoot, 'database', 'Palettes', `PAL_${paddedId}.gif`)
            ];

            const foundPath = possiblePaths.find(p => fs.existsSync(p));
            if (foundPath) {
                res.writeHead(200, { 'Content-Type': 'image/gif', 'Access-Control-Allow-Origin': '*' });
                fs.createReadStream(foundPath).pipe(res);
                return;
            }
        }
        res.writeHead(404); res.end('Palette preview not found');
        return;
    }

    // Serve media files (generic)
    if (url.pathname === '/media') {
        const filePath = url.searchParams.get('path');
        if (filePath && fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogg': 'video/ogg',
                '.mov': 'video/quicktime',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Accept-Ranges': 'bytes'
            });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404); res.end('Not found');
        }
        return;
    }

    res.writeHead(404); res.end('Not found');
});

io.on('connection', (socket: any) => {
    console.log('Client connected to Antigravity Socket:', socket.id);

    // Tell all clients (including the host) that a new user joined and needs the state
    io.emit('execute', { type: 'REQUEST_STATE' });

    // Broadcast updated client list
    const broadcastClients = () => {
        const clients = Array.from(io.sockets.sockets.values()).map((s: any) => {
            const dbClient = s._clientUUID ? dbManager.getRemoteClient(s._clientUUID) : null;
            return {
                id: s.id,
                uuid: s._clientUUID || null,
                friendlyName: dbClient?.friendlyName || (s._clientUUID ? 'Workstation' : null),
                isLocked: !!dbClient?.isLocked,
                isAuthorized: !!s._isAuthorized,
                type: dbClient?.type || 'REMOTE'
            };
        });
        io.emit('execute', { type: 'CLIENTS_UPDATE', clients });
    };

    broadcastClients();

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        broadcastClients();
    });

    socket.on('command', (data: any) => {
        // Don't log camera frames (too noisy)
        if (data.type !== 'CAMERA_FRAME') {
            console.log('Command received:', data);
        }

        // Authorization check: Only allow certain commands if not authorized
        const authCommands = ['REGISTER_CLIENT', 'VERIFY_HOST_PIN', 'COMPLETE_REGISTRATION', 'VERIFY_CLIENT_PIN'];
        if (!socket._isAuthorized && !authCommands.includes(data.type)) {
            // console.log(`[Server] Blocking unauthorized command ${data.type} from ${socket.id}`);
            return;
        }

        // If it's an event trigger, process it for WLED/Video
        if (data.type === 'EVENT_TRIGGER') {
            networkManager.processEvent(data.event);
        }

        // If it's a state broadcast from host to clients, only send to authorized ones
        if (data.type === 'STATE_SYNC') {
            for (const s of io.sockets.sockets.values()) {
                const rs = s as any;
                if (rs._isAuthorized && s.id !== socket.id) {
                    s.emit('execute', data);
                }
            }
            return;
        }

        // Register client with UUID
        if (data.type === 'REGISTER_CLIENT') {
            const uuid = data.clientUUID;
            socket._clientUUID = uuid;
            console.log(`--- NETWORK: Registering client ${socket.id} with UUID: ${uuid}`);

            // Only auto-authorize if it's the actual Electron app (isHost) on the local machine
            const isLocal = socket.handshake.address === '127.0.0.1' ||
                socket.handshake.address === '::1' ||
                socket.handshake.address.includes('localhost') ||
                socket.handshake.address.includes('127.0.0.1');

            if (isLocal && data.isHost) {
                console.log(`--- NETWORK: Authorizing local Electron host ${socket.id}`);

                // Check if host is already connected on another socket
                const existing = Array.from(io.sockets.sockets.values()).find((s: any) => s._clientUUID === uuid && s._isAuthorized && s.id !== socket.id) as any;
                if (existing) {
                    console.log(`--- NETWORK: Host ${uuid} already connected on ${existing.id}. Disconnecting old socket.`);
                    existing.disconnect();
                }

                socket._isAuthorized = true;

                // Ensure host is in DB
                let hostClient = dbManager.getRemoteClient(uuid);
                if (!hostClient) {
                    console.log(`--- NETWORK: Creating initial DB entry for Host station`);
                    dbManager.upsertRemoteClient({
                        id: uuid,
                        friendlyName: 'Show Controller (Host)',
                        pinCode: '',
                        type: 'HOST'
                    });
                    hostClient = dbManager.getRemoteClient(uuid);
                }

                socket.emit('execute', { type: 'AUTHORIZED', friendlyName: hostClient?.friendlyName || 'Show Controller' });
                broadcastClients();
                return;
            }

            console.log(`--- NETWORK: Client ${uuid} is a REMOTE connection (isHost: ${data.isHost}, address: ${socket.handshake.address})`);

            // Check if client exists in DB
            const client = dbManager.getRemoteClient(uuid);
            const clientsInDb = dbManager.getRemoteClients().filter((c: any) => c.type !== 'HOST');

            if (!client) {
                console.log(`--- NETWORK: Client ${uuid} NOT found in DB. Sending REGISTRATION_REQUIRED (NOT_FOUND).`);
                socket.emit('execute', {
                    type: 'REGISTRATION_REQUIRED',
                    status: 'NOT_FOUND',
                    existingClients: clientsInDb.map((c: any) => ({ id: c.id, friendlyName: c.friendlyName }))
                });
            } else {
                console.log(`--- NETWORK: Client ${uuid} found in DB as '${client.friendlyName}'. Sending REGISTRATION_REQUIRED (WAITING_PIN).`);
                socket.emit('execute', {
                    type: 'REGISTRATION_REQUIRED',
                    status: 'WAITING_PIN',
                    friendlyName: client.friendlyName
                });
            }
            broadcastClients();
            return;
        }

        if (data.type === 'VERIFY_HOST_PIN') {
            const settings = dbManager.getAppSettings();
            if (data.pin === settings.accessPin || settings.accessPin === '') {
                socket.emit('execute', { type: 'HOST_PIN_CORRECT' });
            } else {
                socket.emit('execute', { type: 'HOST_PIN_INCORRECT' });
            }
            return;
        }

        if (data.type === 'COMPLETE_REGISTRATION') {
            console.log(`--- NETWORK: Completing registration for ${socket._clientUUID} as '${data.friendlyName}'`);
            // New client registration after Host PIN was correct
            dbManager.upsertRemoteClient({
                id: socket._clientUUID,
                friendlyName: data.friendlyName,
                pinCode: data.pinCode,
                type: 'REMOTE'
            });
            socket._isAuthorized = true;
            socket.emit('execute', { type: 'AUTHORIZED', friendlyName: data.friendlyName });
            broadcastClients();
            return;
        }

        if (data.type === 'VERIFY_CLIENT_PIN') {
            const client = dbManager.getRemoteClient(socket._clientUUID);
            const settings = dbManager.getAppSettings() || { accessPin: '' };
            const inputPin = String(data.pin || '').trim();
            const masterPin = String(settings.accessPin || '').trim();
            const clientPin = String(client?.pinCode || '').trim();

            console.log(`--- NETWORK: PIN Auth for ${socket._clientUUID} (${client?.friendlyName || 'Unknown'})`);
            console.log(`--- NETWORK: [${inputPin}] vs Client:[${clientPin}] vs Master:[${masterPin}]`);

            const isClientPin = clientPin !== '' && inputPin === clientPin;
            const isMasterPin = masterPin !== '' && inputPin === masterPin;

            if (isClientPin || isMasterPin) {
                console.log(`--- NETWORK: Auth SUCCESS via ${isMasterPin ? 'MASTER PIN' : 'CLIENT PIN'}`);

                // Concurrent session cleanup
                const existing = Array.from(io.sockets.sockets.values()).find((s: any) => s._clientUUID === socket._clientUUID && s._isAuthorized && s.id !== socket.id) as any;
                if (existing) {
                    console.log(`--- NETWORK: Active session found for this UUID. Disconnecting old socket.`);
                    existing.disconnect();
                }

                socket._isAuthorized = true;
                socket.emit('execute', { type: 'AUTHORIZED', friendlyName: client?.friendlyName || 'Show Controller' });
                dbManager.updateRemoteClientStatus(socket._clientUUID, { lastConnected: new Date(), isLocked: false });
                broadcastClients();
            } else {
                console.log(`--- NETWORK: Auth FAILED. Invalid PIN.`);
                socket.emit('execute', { type: 'CLIENT_PIN_INCORRECT' });
            }
            return;
        }

        if (data.type === 'SET_LOCKED') {
            if (socket._clientUUID) {
                dbManager.updateRemoteClientStatus(socket._clientUUID, { isLocked: data.locked });
                broadcastClients();
            }
            return;
        }

        // Camera frames: broadcast to all OTHER clients (not back to sender)
        if (data.type === 'CAMERA_FRAME') {
            // Log every 50th frame to verify frames are arriving
            if (!socket._cameraFrameCount) socket._cameraFrameCount = 0;
            socket._cameraFrameCount++;
            if (socket._cameraFrameCount % 50 === 1) {
                console.log(`[Server] CAMERA_FRAME #${socket._cameraFrameCount} from ${socket.id} (${socket._clientUUID}), broadcasting to ${io.sockets.sockets.size - 1} other clients`);
            }
            socket.broadcast.emit('execute', data);
            return;
        }

        // Camera stopped: broadcast to all OTHER clients so they clear the frozen frame
        if (data.type === 'CAMERA_STOPPED') {
            socket.broadcast.emit('execute', data);
            return;
        }

        // Broadcast to all clients (e.g. video walls, remote notebooks)
        io.emit('execute', data);
    });
});


// IPC Handlers for File Dialogs
ipcMain.handle('select-directory', async (event: any, options: any) => {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, {
        ...options,
        properties: ['openDirectory', 'createDirectory']
    });
    return result;
});

ipcMain.handle('select-file', async (event: any, options: any) => {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, options);
    return result;
});

ipcMain.handle('save-file-dialog', async (event: any, options: any) => {
    const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, options);
    return result;
});

ipcMain.handle('db:save-logo', async (_e: any, { arrayBuffer }: { arrayBuffer: ArrayBuffer }) => {
    const buffer = Buffer.from(arrayBuffer);
    const logoDir = path.join(app.getPath('userData'), 'assets');
    if (!fs.existsSync(logoDir)) {
        fs.mkdirSync(logoDir, { recursive: true });
    }
    // Use fixed filename so the URL stays stable (no cache issues)
    const logoPath = path.join(logoDir, 'logo.png');
    fs.writeFileSync(logoPath, buffer);
    // Return HTTP URL so remote clients can also load it (file server on FILE_PORT)
    return `http://localhost:${FILE_PORT}/logo`;
});

// Database IPC Handlers
ipcMain.handle('db:get-app-settings', () => dbManager.getAppSettings());
ipcMain.handle('db:update-app-settings', (_e: any, settings: any) => dbManager.updateAppSettings(settings));

ipcMain.handle('db:get-shows', () => dbManager.getShows());
ipcMain.handle('db:create-show', (_e: any, show: any) => dbManager.createShow(show));
ipcMain.handle('db:update-show', (_e: any, { id, partial }: any) => dbManager.updateShow(id, partial));
ipcMain.handle('db:delete-show', (_e: any, id: any) => dbManager.deleteShow(id));
ipcMain.handle('db:archive-show', (_e: any, { id, archived }: any) => dbManager.archiveShow(id, archived));
ipcMain.handle('db:debug-dump', () => dbManager.debugDump());
ipcMain.handle('db:get-tables', () => dbManager.getTables());
ipcMain.handle('db:get-table-data', (_e: any, tableName: string) => dbManager.getTableData(tableName));
ipcMain.handle('db:update-row', (_e: any, { tableName, id, data }: { tableName: string, id: any, data: any }) => dbManager.updateRow(tableName, id, data));
ipcMain.handle('db:delete-row', (_e: any, { tableName, id }: { tableName: string, id: any }) => dbManager.deleteRow(tableName, id));
ipcMain.handle('db:parse-script', async (_e: any, filePath: string) => {
    const settings = dbManager.getAppSettings();
    return parsePdfScript(filePath, settings?.geminiApiKey);
});

ipcMain.handle('db:get-devices', (_e: any, showId: string) => {
    const devices = dbManager.getDevices(showId);
    console.log(`--- DB: get-devices for ${showId}, found ${devices.length} devices. IDs: ${devices.map(d => d.id).join(', ')}`);
    return devices;
});
ipcMain.handle('db:save-devices', (_e: any, { showId, devices }: any) => dbManager.saveDevices(showId, devices));

ipcMain.handle('db:get-sequences', (_e: any, showId: any) => dbManager.getSequences(showId));
ipcMain.handle('db:save-sequences', (_e: any, { showId, events }: any) => dbManager.saveSequences(showId, events));

ipcMain.handle('db:get-remote-clients', () => dbManager.getRemoteClients());
ipcMain.handle('db:get-remote-client', (_e: any, id: string) => dbManager.getRemoteClient(id));
ipcMain.handle('db:upsert-remote-client', (_e: any, client: any) => dbManager.upsertRemoteClient(client));
ipcMain.handle('db:update-remote-client-status', (_e: any, { id, updates }: any) => dbManager.updateRemoteClientStatus(id, updates));
ipcMain.handle('db:cleanup', () => dbManager.cleanupDatabase());

ipcMain.handle('get-ip-address', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const preferredNames = ['wi-fi', 'wifi', 'ethernet', 'lan', 'wlan', 'en0', 'eth0'];

    let fallbackIp = '127.0.0.1';
    let detectedIps: { name: string, ip: string }[] = [];

    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();

        // Skip known VPN or virtual adapters
        if (lowerName.includes('vpn') ||
            lowerName.includes('nordlynx') ||
            lowerName.includes('tunnel') ||
            lowerName.includes('virtual') ||
            lowerName.includes('docker') ||
            lowerName.includes('pseudo')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // If it's a preferred interface, return it immediately
                if (preferredNames.some(pref => lowerName.includes(pref))) {
                    return iface.address;
                }
                detectedIps.push({ name: lowerName, ip: iface.address });
            }
        }
    }

    // If no preferred interface was found, but we have some IPs, take the first one
    return detectedIps.length > 0 ? detectedIps[0].ip : fallbackIp;
});

ipcMain.handle('scan-devices', (event: any) => {
    return deviceScanner.scan((status: string, progress: number, found: number) => {
        try {
            if (!event.sender.isDestroyed()) {
                event.sender.send('scan-progress', { status, progress, found });
            }
        } catch (e) {
            // ignore
        }
    });
});

const getTestVideoPath = () => {
    const settings = dbManager.getAppSettings();
    let resourcePath = settings?.testVideoPath;

    if (!resourcePath || !fs.existsSync(resourcePath)) {
        resourcePath = path.join(__dirname, '../../Resources/TestBeeld en Audio.mp4');
        if (!fs.existsSync(resourcePath)) {
            resourcePath = path.join(process.resourcesPath, 'Resources/TestBeeld en Audio.mp4');
        }
    }

    // Fix for Windows paths in URL
    if (fs.existsSync(resourcePath)) {
        return require('url').pathToFileURL(resourcePath).href;
    }
    return null;
}

ipcMain.handle('get-test-video-path', () => {
    return getTestVideoPath();
});

ipcMain.handle('test-device', (_e: any, device: any) => {
    if (device.type === 'local_monitor') {
        const win = ensureProjectionWindow(device.id, device.monitorId !== undefined ? device.monitorId : 1);
        const fileUrl = getTestVideoPath();

        if (fileUrl) {
            console.log('[Main] Playing test video from:', fileUrl);
            setTimeout(() => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('media-play', {
                        url: fileUrl,
                        loop: true,
                        volume: 100,
                        mute: false
                    });
                }
            }, 1500);
        }
        return true;
    }
    return networkManager.testDevice(device);
});

ipcMain.handle('wled:get-info', (_e: any, ip: string) => networkManager.getWledInfo(ip));
ipcMain.handle('wled:get-effects', (_e: any, ip: string) => networkManager.getWledEffects(ip));
ipcMain.handle('wled:get-palettes', (_e: any, ip: string) => networkManager.getWledPalettes(ip));
ipcMain.handle('wiz:get-pilot', (_e: any, ip: string) => networkManager.sendWizCommand(ip, 'getPilot', {}));

// Clipboard Handlers
ipcMain.handle('db:get-clipboard', () => dbManager.getClipboard());
ipcMain.handle('db:add-to-clipboard', (_e: any, { type, data }: any) => dbManager.addToClipboard(type, data));
ipcMain.handle('db:remove-from-clipboard', (_e: any, id: number) => dbManager.removeFromClipboard(id));
ipcMain.handle('db:clear-clipboard', () => dbManager.clearClipboard());

ipcMain.on('app-quit', () => {
    app.quit();
});

ipcMain.on('projection-error', (event: any, error: any) => {
    // Forward to main window (Host) if available
    const wins = BrowserWindow.getAllWindows();
    const hostWin = wins.find((w: any) => w.title === 'KLT LedShow Host');
    if (hostWin) {
        hostWin.webContents.send('flash-message', { type: 'error', message: `Projection Error: ${error}` });
    }
});

ipcMain.on('test-flash', (event: any) => {
    if (!event.sender.isDestroyed()) {
        event.sender.send('flash-message', { type: 'info', message: 'Dit is een test bericht van het systeem.' });
    }
});

ipcMain.handle('get-displays', () => {
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    return displays.map((d: any, i: number) => ({
        id: d.id,
        index: i,
        isPrimary: d.id === primaryId,
        label: `${i + 1}: ${d.size.width}x${d.size.height}${d.id === primaryId ? ' (Hoofdscherm)' : ''}`,
        bounds: d.bounds
    }));
});


const projectionWindows = new Map<string, any>();
const lastMediaStates = new Map<string, { command: string, payload: any }>();

function ensureProjectionWindow(deviceId: string, monitorIndex: number) {
    if (projectionWindows.has(deviceId)) {
        const existing = projectionWindows.get(deviceId);
        if (!existing.isDestroyed()) {
            existing.focus();
            return existing;
        }
        projectionWindows.delete(deviceId);
    }

    const displays = screen.getAllDisplays();
    const targetDisplay = displays[monitorIndex] || displays[0];

    const win = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        fullscreen: true,
        frame: false,
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            backgroundThrottling: false,
            autoplayPolicy: 'no-user-gesture-required'
        },
        title: `Projection - Device ${deviceId}`
    });

    const isDevMode = false; // We could pass this via query param if we had it handy, or send via IPC after load

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(`${process.env.VITE_DEV_SERVER_URL}#projection?deviceId=${deviceId}`);
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: `projection?deviceId=${deviceId}` });
    }

    projectionWindows.set(deviceId, win);

    win.webContents.on('did-finish-load', () => {
        // Inject deviceId so the window knows who it is (fallback to URL param)
        win.webContents.executeJavaScript(`window.projectionDeviceId = "${deviceId}";`);
        console.log(`[Main] Projection window for ${deviceId} loaded.`);
    });

    win.on('closed', () => {
        projectionWindows.delete(deviceId);
    });

    return win;
}

ipcMain.handle('start-projection', (_e: any, { deviceId, monitorIndex }: { deviceId: string, monitorIndex: number }) => {
    ensureProjectionWindow(deviceId, monitorIndex);
    return true;
});

ipcMain.handle('close-projection', (_e: any, deviceId: string) => {
    const win = projectionWindows.get(deviceId);
    if (win && !win.isDestroyed()) {
        win.close();
    }
    projectionWindows.delete(deviceId);
});

// Window notifies it is ready (React mounted and listening)
ipcMain.on('projection-ready', (event: any, rendererDeviceId?: string) => {
    // Find deviceId for this sender
    let deviceId = rendererDeviceId;

    if (!deviceId) {
        for (const [id, win] of projectionWindows.entries()) {
            if (win.webContents === event.sender) {
                deviceId = id;
                break;
            }
        }
    }

    if (deviceId) {
        console.log(`[Main] Projection window ready for device ${deviceId}. Syncing state...`);
        const lastState = lastMediaStates.get(deviceId);
        if (lastState) {
            event.sender.send(`media-${lastState.command}`, lastState.payload);
        }
    }
});

// Status updates from Projection Window
ipcMain.on('media-status-update', (_e: any, { deviceId, status }: any) => {
    if (!deviceId) return;

    const currentState = lastMediaStates.get(deviceId);
    if (currentState) {
        // Update the payload with actual status from video element
        currentState.payload = {
            ...currentState.payload,
            ...status,
            playing: status.playing
        };
        // Command remains 'play' if it was playing, or we could update it.
        // For now just merge status into payload and persist.
        try {
            dbManager.updateDeviceMediaState(deviceId, currentState);
        } catch (err) { /* ignore */ }
    }
});

// Media Control - One way from Main Window to Projection Window
ipcMain.on('media-command', (_e: any, { deviceId, command, payload }: any) => {
    console.log(`[Main] Media command: ${command} for device ${deviceId}`, payload);

    // Save state for sync when window (re)loads
    const currentState = lastMediaStates.get(deviceId) || { command: 'stop', payload: {} };

    // Merge or set new state
    let newState: any;
    if (command === 'play') {
        newState = {
            command: 'play',
            payload: {
                ...payload,
                startTime: Date.now()
            }
        };
    } else if (command === 'stop') {
        newState = { command: 'stop', payload: { fadeOutTime: payload?.fadeOutTime || 0 } };
    } else if (command === 'update') {
        newState = {
            command: currentState.command,
            payload: { ...currentState.payload, ...payload }
        };
    } else if (command === 'volume') {
        newState = {
            command: currentState.command,
            payload: { ...currentState.payload, volume: payload.volume, mute: payload.mute }
        };
    } else {
        newState = { command, payload };
    }

    lastMediaStates.set(deviceId, newState);

    // Persist to Database
    try {
        dbManager.updateDeviceMediaState(deviceId, newState);
    } catch (err) {
        console.error('Failed to persist media state to DB:', err);
    }

    const win = projectionWindows.get(deviceId);
    if (win && !win.isDestroyed()) {
        win.webContents.send(`media-${command}`, payload);
    } else {
        console.log(`[Main] No window found for device ${deviceId}, command saved for when it opens.`);
    }
});

ipcMain.handle('wiz-command', async (_e: any, { ip, method, params }: any) => {
    return await networkManager.sendWizCommand(ip, method, params);
});

ipcMain.handle('upload-to-agent', async (_e: any, { url, filePath }: { url: string, filePath: string }) => {
    console.log(`[Main] Uploading ${filePath} to ${url}...`);
    try {
        const formData = new (require('form-data'))();
        formData.append('video', fs.createReadStream(filePath));

        const response = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
        return response.status === 200 || response.status === 201;
    } catch (error) {
        console.error('[Main] Upload failed:', error);
        return false;
    }
});


// Get port from settings, default to 3001 (already declared above)

server.listen(SOCKET_PORT, () => {
    console.log(`Socket.io server running on port ${SOCKET_PORT}`);
});

server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
        console.error('Socket Port in use');
        dialog.showErrorBox('Applicatie is al actief', `Er draait al een instantie van de applicatie op poort ${SOCKET_PORT}.\nControleer of de app al open staat en sluit deze eerst af.`);
        app.quit();
    }
});

fileServer.listen(FILE_PORT, () => {
    console.log(`File server running on port ${FILE_PORT} (logo, PDFs)`);
});


// Define paths for production/dev
const DIST = path.join(__dirname, '../dist');
const PUBLIC = app.isPackaged ? DIST : path.join(DIST, '../public');


// ... (existing code)

function createWindow() {
    const settings = dbManager.getAppSettings();
    const monitorIndex = settings?.controllerMonitorIndex || 0;
    const displays = screen.getAllDisplays();
    const externalDisplay = displays[monitorIndex] || displays[0];

    const win = new BrowserWindow({
        x: externalDisplay.bounds.x,
        y: externalDisplay.bounds.y,
        width: Math.min(1200, externalDisplay.bounds.width),
        height: Math.min(800, externalDisplay.bounds.height),
        fullscreen: true,
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false, // Allow loading local resources (file://) and prevent CORS issues
            allowRunningInsecureContent: true
        },
        title: 'KLT LedShow Host'
    });

    win.webContents.on('did-fail-load', (event: any, errorCode: number, errorDescription: string) => {
        console.error('Failed to load window:', errorCode, errorDescription);
        dialog.showErrorBox('Failed to load application', `Error: ${errorCode} - ${errorDescription}\nPath: ${path.join(DIST, 'index.html')}`);
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        // Use pathToFileURL to handle special characters and ensuring proper protocol
        const indexUrl = require('url').pathToFileURL(path.join(DIST, 'index.html')).href;
        console.log('Loading URL:', indexUrl);
        win.loadURL(indexUrl);
    }
}

if (app) {
    app.whenReady().then(() => {
        // Register custom protocol for local files
        protocol.handle('ledshow-file', (request: any) => {
            try {
                // Replace protocol to file://
                let urlStr = request.url.replace('ledshow-file://', 'file://');

                // Parse as URL to strip hash/search and handle encoding
                const urlObj = new URL(urlStr);

                // Convert to system path (decodes %20, handles slashes)
                const filePath = fileURLToPath(urlObj);

                // net.fetch requires a file:// URL or path. 
                // constructing a clean file:// URL from the path is safest
                const cleanFileUrl = require('url').pathToFileURL(filePath).href;

                return net.fetch(cleanFileUrl);
            } catch (err) {
                console.error('Protocol handler failed:', err, request.url);
                return new Response('File not found', { status: 404 });
            }
        });

        // Initialize lastMediaStates from DB
        try {
            const states = dbManager.getAllMediaStates();
            for (const { id, mediaState } of states) {
                if (mediaState) {
                    lastMediaStates.set(id, mediaState);
                }
            }
            console.log(`[Main] Restored media state for ${states.length} devices.`);
        } catch (err) {
            console.error('Failed to restore media states from DB:', err);
        }

        createWindow();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

} else {
    console.error('Electron app is still undefined. Running in Node instead of Electron?');
}
