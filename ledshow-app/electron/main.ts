import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { networkManager } from './network-manager';
import { dbManager } from './db-manager';
import { deviceScanner } from './device-scanner';

const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain, dialog, protocol, screen, net } = require('electron');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('node:fs');

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

    res.writeHead(404); res.end('Not found');
});

io.on('connection', (socket: any) => {
    console.log('Client connected to Antigravity Socket:', socket.id);

    // Tell all clients (including the host) that a new user joined and needs the state
    io.emit('execute', { type: 'REQUEST_STATE' });

    // Broadcast updated client list
    const broadcastClients = () => {
        const clients = Array.from(io.sockets.sockets.values()).map((s: any) => s.id);
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

        // If it's an event trigger, process it for WLED/Video
        if (data.type === 'EVENT_TRIGGER') {
            networkManager.processEvent(data.event);
        }

        // If it's a state broadcast from host to clients
        if (data.type === 'STATE_SYNC') {
            socket.broadcast.emit('execute', data);
            return;
        }

        // Camera frames: broadcast to all OTHER clients (not back to sender)
        if (data.type === 'CAMERA_FRAME') {
            // Log every 50th frame to verify frames are arriving
            if (!socket._cameraFrameCount) socket._cameraFrameCount = 0;
            socket._cameraFrameCount++;
            if (socket._cameraFrameCount % 50 === 1) {
                console.log(`[Server] CAMERA_FRAME #${socket._cameraFrameCount} from ${socket.id}, broadcasting to ${io.sockets.sockets.size - 1} other clients`);
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

ipcMain.handle('db:get-devices', (_e: any, showId: any) => dbManager.getDevices(showId));
ipcMain.handle('db:save-devices', (_e: any, { showId, devices }: any) => dbManager.saveDevices(showId, devices));

ipcMain.handle('db:get-sequences', (_e: any, showId: any) => dbManager.getSequences(showId));
ipcMain.handle('db:save-sequences', (_e: any, { showId, events }: any) => dbManager.saveSequences(showId, events));

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
                if (!win.isDestroyed()) {
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
    return screen.getAllDisplays().map((d: any, i: number) => ({
        id: d.id,
        index: i,
        label: `${i + 1}: ${d.size.width}x${d.size.height}${i === 0 ? ' (Hoofdscherm)' : ''}`,
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
            webSecurity: false
        },
        title: `Projection - Device ${deviceId}`
    });

    const isDevMode = false; // We could pass this via query param if we had it handy, or send via IPC after load

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(`${process.env.VITE_DEV_SERVER_URL}#projection`);
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'projection' });
    }

    projectionWindows.set(deviceId, win);

    win.webContents.on('did-finish-load', () => {
        // Inject deviceId so the window knows who it is
        win.webContents.executeJavaScript(`window.projectionDeviceId = "${deviceId}";`);

        // Restore last media state if exists
        const lastState = lastMediaStates.get(deviceId);
        if (lastState) {
            win.webContents.send(`media-${lastState.command}`, lastState.payload);
        }
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


// Get port from settings, default to 3001 (already declared above)

server.listen(SOCKET_PORT, () => {
    console.log(`Socket.io server running on port ${SOCKET_PORT}`);
});

fileServer.listen(FILE_PORT, () => {
    console.log(`File server running on port ${FILE_PORT} (logo, PDFs)`);
});


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
        },
        title: 'KLT LedShow Host'
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
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
