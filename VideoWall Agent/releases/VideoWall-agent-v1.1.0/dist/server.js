import express from 'express';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import child_process from 'node:child_process';
import cors from 'cors';
import { PlayerService } from './player.js';
import { DiscoveryService } from './discovery.js';
export class ServerService {
    app;
    server;
    wss;
    player;
    upload;
    logs = [];
    discovery;
    constructor(player, discovery) {
        this.player = player;
        this.discovery = discovery;
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const dir = path.join(process.cwd(), 'media');
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir);
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                cb(null, file.originalname);
            }
        });
        this.upload = multer({ storage });
        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });
        this.setupRoutes();
        this.setupWebSockets();
    }
    /** Compute MD5 checksum of a file */
    computeFileChecksum(filePath) {
        const data = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(data).digest('hex');
    }
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] ${message}`;
        this.logs.unshift(entry);
        if (this.logs.length > 100)
            this.logs.pop();
        console.log(entry);
    }
    getVersion() {
        try {
            const pkgPath = path.join(process.cwd(), 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            return pkg.version || '1.1.0';
        }
        catch (e) {
            return '1.1.0';
        }
    }
    /** Broadcast a message to all output display clients */
    broadcastToOutputClients(message) {
        const data = JSON.stringify(message);
        for (const client of this.player.getOutputClients()) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    }
    setupRoutes() {
        // ---------- File Management ----------
        this.app.post('/upload', (req, res) => {
            this.upload.single('video')(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    this.log(`[Upload] Multer Error: ${err.message}`);
                    return res.status(500).send({ error: `Bestand upload fout: ${err.message}` });
                }
                else if (err) {
                    this.log(`[Upload] Server Error: ${err.message}`);
                    return res.status(500).send({ error: `Server fout tijdens upload: ${err.message}` });
                }
                if (!req.file)
                    return res.status(400).send({ error: 'Geen bestand ontvangen' });
                this.log(`[Upload] File received: ${req.file.filename} (${req.file.size} bytes)`);
                // Notify output clients that sync is complete
                this.broadcastToOutputClients({ action: 'sync-complete', filename: req.file.filename });
                res.send({ message: 'File uploaded successfully', filename: req.file.filename });
            });
        });
        this.app.get('/files', (req, res) => {
            const dir = path.join(process.cwd(), 'media');
            if (!fs.existsSync(dir))
                return res.json([]);
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mov'));
            res.json(files);
        });
        // Checksum validation endpoint
        this.app.get('/files/check', (req, res) => {
            const filename = req.query.filename;
            const checksum = req.query.checksum;
            if (!filename)
                return res.status(400).send({ error: 'Missing filename parameter' });
            const filePath = path.join(process.cwd(), 'media', filename);
            if (!fs.existsSync(filePath)) {
                return res.json({ exists: false, checksumMatch: false });
            }
            if (!checksum) {
                // No checksum provided, just check existence
                return res.json({ exists: true, checksumMatch: false });
            }
            try {
                const localChecksum = this.computeFileChecksum(filePath);
                const match = localChecksum === checksum;
                console.log(`[Check] ${filename}: local=${localChecksum}, hub=${checksum}, match=${match}`);
                return res.json({ exists: true, checksumMatch: match });
            }
            catch (error) {
                console.error(`[Check] Error computing checksum for ${filename}:`, error);
                return res.json({ exists: true, checksumMatch: false });
            }
        });
        this.app.delete('/files/:filename', (req, res) => {
            const filename = req.params.filename;
            const filePath = path.join(process.cwd(), 'media', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                res.send({ message: 'File deleted' });
            }
            else {
                res.status(404).send('File not found');
            }
        });
        // ---------- Static Media Serving ----------
        this.app.use('/media', express.static(path.join(process.cwd(), 'media')));
        // ---------- API Endpoints ----------
        this.app.get('/status', (req, res) => {
            res.send({
                status: 'running',
                agent: 'LedShow VideoWall Agent',
                version: this.getVersion(),
                outputClients: this.player.getOutputClientCount()
            });
        });
        this.app.get('/logs', (req, res) => {
            res.json(this.logs);
        });
        this.app.post('/update', (req, res) => {
            this.upload.single('update')(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    this.log(`[Update] Multer Error: ${err.message}`);
                    return res.status(500).send({ error: `Update upload fout: ${err.message}` });
                }
                else if (err) {
                    this.log(`[Update] Server Error: ${err.message}`);
                    return res.status(500).send({ error: `Server fout tijdens update upload: ${err.message}` });
                }
                if (!req.file)
                    return res.status(400).send({ error: 'Geen update bestand ontvangen' });
                const zipPath = req.file.path;
                const extractPath = process.cwd();
                this.log(`[Update] Received update: ${req.file.filename}`);
                try {
                    // Windows: use PowerShell to expand
                    if (process.platform === 'win32') {
                        const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`;
                        child_process.execSync(cmd);
                    }
                    else {
                        // Linux: use unzip
                        child_process.execSync(`unzip -o "${zipPath}" -d "${extractPath}"`);
                    }
                    this.log('[Update] Extraction successful. Restarting...');
                    res.send({ message: 'Update geïnstalleerd, agent wordt herstart...' });
                    // Exit after a short delay to allow response to be sent
                    setTimeout(() => {
                        process.exit(0);
                    }, 1000);
                }
                catch (error) {
                    this.log(`[Update] Error during extraction: ${error.message}`);
                    res.status(500).send({ error: `Fout tijdens uitpakken update: ${error.message}` });
                }
            });
        });
        this.app.post('/trigger-hub-update', async (req, res) => {
            const hubIp = this.discovery.getHubIp();
            if (!hubIp) {
                this.log('[Update] FOUT: Geen Hub IP gevonden via discovery. Voer een scan uit op de Hub.');
                return res.status(400).send({ error: 'Hub IP niet gevonden. Voer een scan uit op de Hub.' });
            }
            const version = this.getVersion();
            const pkgName = `VideoWall-agent-v${version}.zip`; // Usually matches the current version but we want the zip from hub
            const updateUrl = `http://${hubIp}:3002/agent-package`;
            this.log(`[Update] Starten van update vanaf Hub: ${updateUrl}`);
            try {
                // We'll reuse downloadFile logic but specifically for update.zip
                const updateZipPath = path.join(process.cwd(), 'media', 'agent-update.zip');
                // Manual fetch for the update zip
                const response = await fetch(updateUrl);
                if (!response.ok)
                    throw new Error(`Hub reageerde met ${response.status}: ${response.statusText}`);
                const buffer = Buffer.from(await response.arrayBuffer());
                fs.writeFileSync(updateZipPath, buffer);
                this.log(`[Update] Update gedownload (${buffer.length} bytes)`);
                const extractPath = process.cwd();
                if (process.platform === 'win32') {
                    const cmd = `powershell -Command "Expand-Archive -Path '${updateZipPath}' -DestinationPath '${extractPath}' -Force"`;
                    child_process.execSync(cmd);
                }
                else {
                    child_process.execSync(`unzip -o "${updateZipPath}" -d "${extractPath}"`);
                }
                this.log('[Update] Installatie voltooid. Herstarten...');
                res.send({ message: 'Update gedownload en geïnstalleerd. Agent herstart...' });
                setTimeout(() => process.exit(0), 1000);
            }
            catch (error) {
                this.log(`[Update] Update mislukt: ${error.message}`);
                res.status(500).send({ error: `Update mislukt: ${error.message}` });
            }
        });
        this.app.post('/test-pattern', async (req, res) => {
            this.log('[Dashboard] Request: Test Pattern');
            try {
                await this.player.showTestPattern();
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to show test pattern' });
            }
        });
        this.app.post('/play', async (req, res) => {
            const { filename, loop, volume, mute } = req.body;
            if (!filename)
                return res.status(400).send({ error: 'Missing filename' });
            this.log(`[Dashboard] Request: Play ${filename}`);
            try {
                await this.player.play(filename, { loop, volume, mute });
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to play' });
            }
        });
        this.app.post('/pause', async (req, res) => {
            this.log('[Dashboard] Request: Pause');
            try {
                await this.player.pause();
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to pause' });
            }
        });
        this.app.post('/resume', async (req, res) => {
            this.log('[Dashboard] Request: Resume');
            try {
                await this.player.resume();
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to resume' });
            }
        });
        this.app.post('/volume', async (req, res) => {
            const { level } = req.body;
            this.log(`[Dashboard] Request: Volume ${level}%`);
            try {
                await this.player.setVolume(level);
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to set volume' });
            }
        });
        this.app.post('/repeat', async (req, res) => {
            const { repeat } = req.body;
            this.log(`[Dashboard] Request: Repeat ${repeat}`);
            try {
                await this.player.setRepeat(repeat);
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to set repeat' });
            }
        });
        this.app.post('/stop', async (req, res) => {
            this.log('[Dashboard] Request: Stop');
            try {
                await this.player.stop();
                res.send({ status: 'ok' });
            }
            catch (error) {
                res.status(500).send({ error: 'Failed to stop' });
            }
        });
        this.app.post('/shutdown', (req, res) => {
            this.log('[Dashboard] Request: Shutdown');
            res.send('Agent wordt afgesloten...');
            setTimeout(() => process.exit(0), 1000);
        });
        // ---------- Status Dashboard ----------
        this.app.get('/', (req, res) => {
            const name = process.env.AGENT_NAME || 'VideoWall-Agent';
            const model = process.env.AGENT_MODEL || '4-screen';
            const layout = process.env.AGENT_LAYOUT || '2x2';
            const port = process.env.AGENT_PORT || '3003';
            res.send(this.getStatusPageHTML(name, model, layout, port));
        });
        // ---------- Output Display Page ----------
        this.app.get('/output', (req, res) => {
            res.send(this.getOutputPageHTML());
        });
    }
    async downloadFile(url, filename) {
        const mediaDir = path.join(process.cwd(), 'media');
        if (!fs.existsSync(mediaDir))
            fs.mkdirSync(mediaDir, { recursive: true });
        const filePath = path.join(mediaDir, filename);
        this.log(`[Sync] Downloading ${url} to ${filePath}`);
        // Notify output clients that sync is starting
        this.broadcastToOutputClients({ action: 'sync-start', filename });
        const response = await fetch(url);
        if (!response.ok) {
            this.log(`[Sync] Download FAILED: ${response.statusText}`);
            this.broadcastToOutputClients({ action: 'sync-error', filename, error: response.statusText });
            throw new Error(`Failed to download file: ${response.statusText}`);
        }
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }
        const chunks = [];
        let received = 0;
        let lastBroadcastPercent = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            chunks.push(value);
            received += value.length;
            if (contentLength > 0) {
                const percent = Math.round((received / contentLength) * 100);
                // Broadcast progress every 5% to avoid flooding
                if (percent >= lastBroadcastPercent + 5 || percent === 100) {
                    lastBroadcastPercent = percent;
                    this.broadcastToOutputClients({ action: 'sync-progress', filename, percent, received, total: contentLength });
                }
            }
        }
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        this.log(`[Sync] Download complete: ${filename} (${buffer.length} bytes)`);
        this.broadcastToOutputClients({ action: 'sync-complete', filename });
    }
    setupWebSockets() {
        this.wss.on('connection', (ws, req) => {
            const url = req.url || '';
            // Output display clients connect to /output-ws
            if (url.startsWith('/output-ws')) {
                console.log('Output display client connected');
                this.player.addOutputClient(ws);
                return;
            }
            // All other connections are host/controller connections
            console.log('Host connected via WebSocket');
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('Received command:', data);
                    switch (data.action) {
                        case 'play':
                            if (data.filename) {
                                this.log(`[Host] Command: Play ${data.filename}`);
                                await this.player.play(data.filename, {
                                    loop: data.loop,
                                    volume: data.volume,
                                    mute: data.mute,
                                    fadeInTime: data.fadeInTime,
                                    crossoverTime: data.crossoverTime,
                                });
                            }
                            break;
                        case 'stop':
                            this.log('[Host] Command: Stop');
                            await this.player.stop();
                            break;
                        case 'pause':
                            this.log('[Host] Command: Pause');
                            await this.player.pause();
                            break;
                        case 'resume':
                            this.log('[Host] Command: Resume');
                            await this.player.resume();
                            break;
                        case 'test-pattern':
                            this.log('[Host] Command: Test Pattern');
                            await this.player.showTestPattern();
                            break;
                        case 'sync':
                            if (data.url && data.filename) {
                                try {
                                    this.log(`[Sync] Starting sync for ${data.filename}`);
                                    ws.send(JSON.stringify({ type: 'sync_status', status: 'downloading', filename: data.filename }));
                                    // Check if file already exists with matching checksum
                                    if (data.checksum) {
                                        const filePath = path.join(process.cwd(), 'media', data.filename);
                                        if (fs.existsSync(filePath)) {
                                            const localChecksum = this.computeFileChecksum(filePath);
                                            if (localChecksum === data.checksum) {
                                                this.log(`[Sync] File ${data.filename} already exists (checksum match)`);
                                                ws.send(JSON.stringify({ type: 'sync_status', status: 'skipped', filename: data.filename }));
                                                break;
                                            }
                                        }
                                    }
                                    await this.downloadFile(data.url, data.filename);
                                    ws.send(JSON.stringify({ type: 'sync_status', status: 'completed', filename: data.filename }));
                                }
                                catch (error) {
                                    this.log(`[Sync] FAILED for ${data.filename}: ${error.message}`);
                                    ws.send(JSON.stringify({ type: 'sync_status', status: 'error', filename: data.filename, error: error.message }));
                                    this.broadcastToOutputClients({ action: 'sync-error', filename: data.filename, error: error.message });
                                }
                            }
                            break;
                        case 'volume':
                            if (typeof data.level === 'number') {
                                this.log(`[Host] Command: Volume ${data.level}%`);
                                await this.player.setVolume(data.level);
                            }
                            break;
                        case 'repeat':
                            if (typeof data.repeat === 'boolean') {
                                this.log(`[Host] Command: Repeat ${data.repeat}`);
                                this.player.setRepeat(data.repeat);
                            }
                            break;
                        default:
                            console.warn('Unknown WebSocket action:', data.action);
                    }
                }
                catch (e) {
                    console.error('Error processing WebSocket message:', e);
                }
            });
            ws.on('close', () => {
                console.log('Host disconnected');
            });
        });
    }
    // ==========================================
    //  OUTPUT DISPLAY PAGE
    //  This is the fullscreen page that drives
    //  the LED wall. It runs in Chromium kiosk.
    // ==========================================
    getOutputPageHTML() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>LedShow Output</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
            cursor: none;
            user-select: none;
        }
        #video-player {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: contain;
            display: none;
            z-index: 2;
        }
        #image-display {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: contain;
            display: none;
            z-index: 2;
        }
        #test-pattern {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            display: none;
            z-index: 2;
            background: #000;
        }
        /* SMPTE-style test pattern using pure CSS */
        .color-bars {
            display: flex;
            height: 70%;
        }
        .color-bars div { flex: 1; }
        .bar-white { background: #fff; }
        .bar-yellow { background: #ff0; }
        .bar-cyan { background: #0ff; }
        .bar-green { background: #0f0; }
        .bar-magenta { background: #f0f; }
        .bar-red { background: #f00; }
        .bar-blue { background: #00f; }
        .bar-black { background: #000; }
        .gradient-bar {
            height: 15%;
            background: linear-gradient(to right, #000, #fff);
        }
        .info-bar {
            height: 15%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111;
            color: #fff;
            font-family: monospace;
            font-size: 2vw;
            letter-spacing: 0.2em;
        }
        #status-overlay {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: #22c55e;
            font-family: monospace;
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 8px;
            z-index: 100;
            display: none;
        }
        #status-overlay.disconnected { color: #ef4444; }

        /* Sync overlay — shown during file transfers */
        #sync-overlay {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.95) 40%);
            padding: 40px 40px 30px;
            z-index: 50;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        #sync-overlay .sync-label {
            color: #fbbf24;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 6px;
        }
        #sync-overlay .sync-filename {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 12px;
            opacity: 0.9;
        }
        #sync-overlay .sync-bar-track {
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            overflow: hidden;
        }
        #sync-overlay .sync-bar-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            border-radius: 2px;
            transition: width 0.3s ease;
        }
        #sync-overlay .sync-percent {
            color: rgba(255,255,255,0.5);
            font-size: 12px;
            margin-top: 6px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <video id="video-player" autoplay></video>
    <img id="image-display" />
    <div id="test-pattern">
        <div class="color-bars">
            <div class="bar-white"></div>
            <div class="bar-yellow"></div>
            <div class="bar-cyan"></div>
            <div class="bar-green"></div>
            <div class="bar-magenta"></div>
            <div class="bar-red"></div>
            <div class="bar-blue"></div>
            <div class="bar-black"></div>
        </div>
        <div class="gradient-bar"></div>
        <div class="info-bar" id="test-pattern-text">LEDSHOW AGENT — TEST PATTERN</div>
    </div>
    <div id="status-overlay">Connected</div>
    <div id="sync-overlay">
        <div class="sync-label">⬇ Bestand ontvangen</div>
        <div class="sync-filename" id="sync-filename"></div>
        <div class="sync-bar-track"><div class="sync-bar-fill" id="sync-bar-fill"></div></div>
        <div class="sync-percent" id="sync-percent"></div>
    </div>

    <script>
        const video = document.getElementById('video-player');
        const image = document.getElementById('image-display');
        const testPattern = document.getElementById('test-pattern');
        const statusOverlay = document.getElementById('status-overlay');

        let ws;
        let reconnectInterval;

        function hideAll() {
            video.style.display = 'none';
            video.pause();
            video.src = '';
            image.style.display = 'none';
            image.src = '';
            testPattern.style.display = 'none';
        }

        function showVideo(filename, opts) {
            opts = opts || {};
            const isRepeat = opts.loop === true || opts.repeat === true || (opts.action === 'repeat' && opts.repeat === true);
            const volume   = typeof opts.volume === 'number' ? opts.volume : 100;
            const mute     = opts.mute === true;
            const fadeMs   = typeof opts.fadeInTime === 'number' ? (opts.fadeInTime < 10 ? opts.fadeInTime * 1000 : opts.fadeInTime) : 0;

            console.log('[Output] Play Video: ' + filename + ', Loop: ' + isRepeat + ', Volume: ' + volume + ', Mute: ' + mute);

            hideAll();
            let cleanName;
            try { cleanName = decodeURIComponent(filename); } catch(e) { cleanName = filename; }

            video.pause();
            video.removeAttribute('src');
            video.load();

            // Set loop immediately
            video.loop = isRepeat;
            if (isRepeat) video.setAttribute('loop', 'loop');
            else video.removeAttribute('loop');

            video.muted  = true;
            video.volume = 0;
            video.style.display = 'block';

            // Clear old listeners to avoid stacking
            video.onended = null;
            if (isRepeat) {
                video.onended = () => {
                    console.log('[Output] Video ended, restarting (manual loop fallback)');
                    video.currentTime = 0;
                    video.play().catch(() => {});
                };
            }

            const onCanPlay = () => {
                video.removeEventListener('canplay', onCanPlay);
                
                // Re-enforce loop on canplay (some browsers reset it)
                video.loop = isRepeat;
                
                video.play()
                    .then(() => {
                        if (mute) {
                            video.muted  = true;
                            video.volume = 0;
                        } else {
                            video.muted = false;
                            const targetVol = Math.max(0, Math.min(1, volume / 100));
                            if (fadeMs > 0) {
                                const start = performance.now();
                                function ramp(ts) {
                                    const t = Math.min((ts - start) / fadeMs, 1);
                                    video.volume = t * targetVol;
                                    if (t < 1) requestAnimationFrame(ramp);
                                }
                                requestAnimationFrame(ramp);
                            } else {
                                video.volume = targetVol;
                            }
                        }
                    })
                    .catch(e => {
                        console.warn('[Output] Autoplay prevented, retrying muted...', e);
                        video.muted = true;
                        video.play().catch(e2 => console.error('[Output] Play failed:', e2));
                    });
            };

            video.addEventListener('canplay', onCanPlay);
            video.src = '/media/' + encodeURIComponent(cleanName);
            video.load();
        }

        function showImage(filename) {
            hideAll();
            let cleanName;
            try { cleanName = decodeURIComponent(filename); } catch(e) { cleanName = filename; }
            image.style.display = 'block';
            image.src = '/media/' + encodeURIComponent(cleanName);
        }

        function showTestPattern() {
            hideAll();
            testPattern.style.display = 'block';
        }

        function stopAll() { hideAll(); }

        function connect() {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + location.host + '/output-ws');

            ws.onopen = () => {
                statusOverlay.textContent = 'Connected';
                statusOverlay.className = '';
                statusOverlay.style.display = 'block';
                setTimeout(() => { statusOverlay.style.display = 'none'; }, 3000);
                if (reconnectInterval) { clearInterval(reconnectInterval); reconnectInterval = null; }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.action) {
                        case 'play':
                            if (data.filename) {
                                const ext = data.filename.split('.').pop().toLowerCase();
                                if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
                                    showVideo(data.filename, data);
                                } else {
                                    showImage(data.filename);
                                }
                            }
                            break;
                        case 'test-pattern': showTestPattern(); break;
                        case 'stop': stopAll(); break;
                        case 'pause': video.pause(); break;
                        case 'resume': video.play().catch(e => {}); break;
                        case 'volume': if (typeof data.level === 'number') video.volume = Math.max(0, Math.min(1, data.level / 100)); break;
                        case 'repeat': if (typeof data.repeat === 'boolean') video.loop = data.repeat; break;
                        case 'sync-start': showSyncOverlay(data.filename); break;
                        case 'sync-progress': updateSyncProgress(data.percent || 0, data.filename); break;
                        case 'sync-complete': completeSyncOverlay(data.filename); break;
                        case 'sync-error': errorSyncOverlay(data.filename, data.error); break;
                    }
                } catch (e) {}
            };

            ws.onclose = () => {
                statusOverlay.textContent = 'Disconnected — reconnecting...';
                statusOverlay.className = 'disconnected';
                statusOverlay.style.display = 'block';
                if (!reconnectInterval) reconnectInterval = setInterval(connect, 3000);
            };

            ws.onerror = (err) => { ws.close(); };
        }

        document.body.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        });

        const syncOverlay = document.getElementById('sync-overlay');
        const syncFilename = document.getElementById('sync-filename');
        const syncBarFill = document.getElementById('sync-bar-fill');
        const syncPercent = document.getElementById('sync-percent');
        let syncHideTimer = null;

        function showSyncOverlay(filename) {
            if (syncHideTimer) { clearTimeout(syncHideTimer); syncHideTimer = null; }
            syncFilename.textContent = filename || 'Onbekend bestand';
            syncBarFill.style.width = '0%';
            syncPercent.textContent = 'Voorbereiden...';
            syncOverlay.style.display = 'block';
        }

        function updateSyncProgress(percent, filename) {
            if (syncOverlay.style.display === 'none') showSyncOverlay(filename);
            syncBarFill.style.width = percent + '%';
            syncPercent.textContent = percent + '%';
        }

        function completeSyncOverlay(filename) {
            syncBarFill.style.width = '100%';
            syncPercent.textContent = 'Voltooid';
            syncHideTimer = setTimeout(() => { syncOverlay.style.display = 'none'; }, 2500);
        }

        function errorSyncOverlay(filename, error) {
            syncBarFill.style.width = '100%';
            syncBarFill.style.background = '#ef4444';
            syncPercent.textContent = 'Fout: ' + (error || 'Onbekend');
            syncHideTimer = setTimeout(() => {
                syncOverlay.style.display = 'none';
                syncBarFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            }, 5000);
        }

        connect();
        showTestPattern();
    </script>
</body>
</html>`;
    }
    // ==========================================
    //  STATUS DASHBOARD PAGE
    // ==========================================
    getStatusPageHTML(name, model, layout, port) {
        const version = this.getVersion();
        return `<!DOCTYPE html>
<html>
<head>
    <title>LedShow Agent Status</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0f19;
            --card-bg: rgba(17, 24, 39, 0.8);
            --accent: #fbbf24;
            --accent-glow: rgba(251, 191, 36, 0.3);
            --success: #10b981;
            --danger: #ef4444;
            --text: #f3f4f6;
            --text-muted: #9ca3af;
            --border: rgba(31, 41, 55, 0.5);
            --log-bg: #05070a;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg);
            background-image: 
                radial-gradient(circle at 0% 0%, rgba(30, 58, 138, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(251, 191, 36, 0.05) 0%, transparent 50%);
            color: var(--text);
            margin: 0;
            padding: 2rem;
            min-height: 100vh;
            display: flex;
            justify-content: center;
        }
        .dashboard {
            width: 100%;
            max-width: 1000px;
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 1.5rem;
            align-content: start;
        }
        .card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 1.5rem;
            padding: 2rem;
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        header {
            grid-column: span 2;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        h1 { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--accent); }
        .version { font-family: monospace; opacity: 0.5; font-size: 0.8rem; }
        
        .header-actions { display: flex; align-items: center; gap: 1rem; }

        .btn-update {
            background: rgba(251, 191, 36, 0.1);
            color: var(--accent);
            border: 1px solid rgba(251, 191, 36, 0.2);
            padding: 0.4rem 0.8rem;
            border-radius: 99px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }
        .btn-update:hover { background: var(--accent); color: var(--bg); }
        .btn-update:active { transform: scale(0.95); }
        .btn-update.loading { opacity: 0.5; pointer-events: none; animation: pulse 1s infinite; }

        .status-badge {
            display: inline-flex; align-items: center;
            background: rgba(16, 185, 129, 0.1); color: var(--success);
            padding: 0.4rem 0.8rem; border-radius: 99px;
            font-weight: 600; font-size: 0.75rem;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .status-dot {
            width: 6px; height: 6px; background: currentColor; border-radius: 50%;
            margin-right: 0.5rem; animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }

        .info-grid { display: grid; gap: 1rem; margin-top: 1.5rem; }
        .info-row { display: flex; justify-content: space-between; font-size: 0.9rem; }
        .info-label { color: var(--text-muted); }

        .section-title { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 1rem; margin-top: 1.5rem; }
        
        button {
            width: 100%;
            padding: 0.75rem;
            border-radius: 0.75rem;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        button:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
        button:active { transform: scale(0.98); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .btn-accent { background: var(--accent); color: var(--bg); border: none; }
        .btn-accent:hover { background: #fcd34d; box-shadow: 0 0 15px var(--accent-glow); }
        .btn-danger { color: var(--danger); border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); }
        .btn-danger:hover { background: var(--danger); color: white; }

        select {
            width: 100%;
            padding: 0.75rem;
            border-radius: 0.75rem;
            border: 1px solid var(--border);
            background: #05070a;
            color: white;
            margin-bottom: 0.75rem;
            font-family: inherit;
        }

        .controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        
        .logs-panel {
            background: var(--log-bg);
            border-radius: 1rem;
            height: 480px;
            overflow-y: auto;
            border: 1px solid var(--border);
            padding: 1rem;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 0.8rem;
            line-height: 1.4;
        }
        .log-entry { margin-bottom: 0.25rem; border-left: 2px solid transparent; padding-left: 0.5rem; }
        .log-entry.sync { border-color: var(--accent); color: var(--accent); }
        .log-entry.play { border-color: var(--success); color: var(--success); }
        .log-entry.error { border-color: var(--danger); color: var(--danger); }
        .log-time { opacity: 0.4; margin-right: 0.5rem; font-size: 0.75rem; }

        .slider-container { margin: 1.5rem 0; }
        .slider-header { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.5rem; }
        input[type=range] {
            width: 100%;
            appearance: none;
            background: rgba(255,255,255,0.1);
            height: 4px;
            border-radius: 2px;
            outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
            appearance: none; width: 16px; height: 16px;
            background: var(--accent); border-radius: 50%; cursor: pointer;
            box-shadow: 0 0 10px var(--accent-glow);
        }

        .toggle-row { display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; }
        .toggle-label { font-size: 0.9rem; font-weight: 500; }
        .switch {
            position: relative; display: inline-block; width: 40px; height: 20px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background-color: #313131; transition: .4s; border-radius: 20px;
        }
        .slider:before {
            position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px;
            background-color: white; transition: .4s; border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--success); }
        input:checked + .slider:before { transform: translateX(20px); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #313131; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #414141; }
    </style>
</head>
<body>
    <div class="dashboard">
        <header>
            <div>
                <h1>VideoWall AGENT</h1>
                <span class="version">v${version} — ${name}</span>
            </div>
            <div class="header-actions">
                <button id="update-btn" class="btn-update" onclick="runUpdate()">🔄 Update</button>
                <div class="status-badge" id="output-status">
                    <div class="status-dot"></div>
                    <span id="output-text">ONTDEKKEN...</span>
                </div>
            </div>
        </header>

        <div class="left-col">
            <div class="card">
                <div class="section-title">Informatie</div>
                <div class="info-grid">
                    <div class="info-row"><span class="info-label">Model</span><span>${model}</span></div>
                    <div class="info-row"><span class="info-label">Layout</span><span>${layout}</span></div>
                    <div class="info-row"><span class="info-label">Poort</span><span>${port}</span></div>
                    <div class="info-row"><span class="info-label">Clients</span><span id="client-count">0</span></div>
                </div>

                <div class="section-title">Media Selectie</div>
                <select id="media-select">
                    <option value="">Geen media beschikbaar</option>
                </select>
                
                <div class="controls-grid">
                    <button class="btn-accent" onclick="playback('play')">▶ Play</button>
                    <button onclick="playback('stop')">⏹ Stop</button>
                    <button onclick="playback('pause')">⏸ Pause</button>
                    <button onclick="playback('resume')">⏯ Doorgaan</button>
                </div>

                <div class="slider-container">
                    <div class="slider-header"><span>Volume</span><span id="vol-val">100%</span></div>
                    <input type="range" min="0" max="100" value="100" id="vol-slider" oninput="setVolume(this.value)">
                </div>

                <div class="toggle-row">
                    <span class="toggle-label">Herhalen (Loop)</span>
                    <label class="switch"><input type="checkbox" id="repeat-toggle" onchange="setRepeat(this.checked)"><span class="slider"></span></label>
                </div>

                <div class="section-title">Systeem</div>
                <div class="controls-grid">
                    <button onclick="playback('test-pattern')">🏁 Testbeeld</button>
                    <button class="btn-danger" onclick="shutdown()">🔌 Afsluiten</button>
                </div>

                <a href="/output" target="_blank" style="display: block; text-align: center; color: var(--accent); font-size: 0.85rem; margin-top: 1.5rem; text-decoration: none; border: 1px dashed var(--accent); padding: 0.75rem; border-radius: 0.75rem;">
                    ↗ Open Output Venster
                </a>
            </div>
        </div>

        <div class="right-col">
            <div class="card" style="height: 100%; display: flex; flex-direction: column;">
                <div class="section-title" style="margin-top: 0;">Diagnostic Logs</div>
                <div class="logs-panel" id="logs">
                    <div class="log-entry">Bezig met laden van logboek...</div>
                </div>
                <div style="margin-top: 1rem; font-size: 0.7rem; color: var(--text-muted); text-align: center;">
                    Logs worden elke 2 seconden ververst • Maximaal 100 regels
                </div>
            </div>
        </div>
    </div>

    <script>
        async function fetchStatus() {
            try {
                const res = await fetch('/status');
                const data = await res.json();
                document.getElementById('client-count').innerText = data.outputClients;
                const status = document.getElementById('output-status');
                const text = document.getElementById('output-text');
                if (data.outputClients > 0) {
                    status.style.color = 'var(--success)';
                    status.style.background = 'rgba(16, 185, 129, 0.1)';
                    status.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    text.innerText = 'ONLINE';
                } else {
                    status.style.color = 'var(--danger)';
                    status.style.background = 'rgba(239, 68, 68, 0.1)';
                    status.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    text.innerText = 'OFFLINE';
                }
            } catch(e) {}
        }

        async function fetchFiles() {
            try {
                const res = await fetch('/files');
                const files = await res.json();
                const sel = document.getElementById('media-select');
                sel.innerHTML = '';
                if (files.length === 0) {
                    sel.innerHTML = '<option value="">Geen media beschikbaar</option>';
                    return;
                }
                files.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f;
                    opt.innerText = f;
                    sel.appendChild(opt);
                });
            } catch(e) {}
        }

        async function fetchLogs() {
            try {
                const res = await fetch('/logs');
                const logs = await res.json();
                const container = document.getElementById('logs');
                container.innerHTML = logs.map(l => {
                    let cls = 'log-entry';
                    if (l.includes('[Sync]')) cls += ' sync';
                    if (l.includes('Play') || l.includes('Resume')) cls += ' play';
                    if (l.includes('FAILED') || l.includes('Error')) cls += ' error';
                    
                    const timePart = l.match(/\\[(.*?)\\]/);
                    const time = timePart ? timePart[1] : '';
                    const content = l.replace(/\\[(.*?)\\]\\s?/, '');
                    
                    return \`<div class="\${cls}"><span class="log-time">\${time}</span>\${content}</div>\`;
                }).join('');
            } catch(e) {}
        }

        async function playback(action) {
            const file = document.getElementById('media-select').value;
            const repeat = document.getElementById('repeat-toggle').checked;
            const volume = document.getElementById('vol-slider').value;
            
            try {
                const body = action === 'play' ? { filename: file, loop: repeat, volume: parseInt(volume) } : {};
                await fetch('/' + action, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                fetchLogs();
            } catch(e) { alert('Actie mislukt'); }
        }

        async function setVolume(v) {
            document.getElementById('vol-val').innerText = v + '%';
            try {
                await fetch('/volume', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ level: parseInt(v) }) 
                });
            } catch(e) {}
        }

        async function setRepeat(r) {
            try {
                await fetch('/repeat', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repeat: r }) 
                });
            } catch(e) {}
        }

        async function shutdown() {
            if (!confirm('Weet je zeker dat je de agent wilt afsluiten?')) return;
            try { fetch('/shutdown', { method: 'POST' }); alert('Agent wordt afgesloten...'); } catch(e) {}
        }

        async function runUpdate() {
            const btn = document.getElementById('update-btn');
            if (btn.classList.contains('loading')) return;
            
            if (!confirm('Wil je de agent bijwerken naar de laatste versie vanaf de Hub? De agent zal herstarten.')) return;
            
            btn.classList.add('loading');
            btn.innerText = 'Bijwerken...';
            
            try {
                const res = await fetch('/trigger-hub-update', { method: 'POST' });
                const data = await res.json();
                
                if (res.ok) {
                    alert('Update succesvol! De agent herstart nu. Dit dashboard ververst over 5 seconden.');
                    btn.innerText = 'Herstarten...';
                    setTimeout(() => location.reload(), 5000);
                } else {
                    alert('Update mislukt: ' + (data.error || 'Onbekend'));
                    btn.classList.remove('loading');
                    btn.innerText = '🔄 Update';
                }
            } catch(e) {
                alert('Update fout: ' + e.message);
                btn.classList.remove('loading');
                btn.innerText = '🔄 Update';
            }
        }

        setInterval(fetchStatus, 3000);
        setInterval(fetchLogs, 2000);
        fetchStatus();
        fetchFiles();
        fetchLogs();
    </script>
</body>
</html>`;
    }
    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`HTTP/WS Server listening on port ${port}`);
        });
    }
}
//# sourceMappingURL=server.js.map