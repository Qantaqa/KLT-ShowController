import express from 'express';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import { PlayerService } from './player.js';
export class ServerService {
    app;
    server;
    wss;
    player;
    upload;
    constructor(player) {
        this.player = player;
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
    setupRoutes() {
        this.app.post('/upload', this.upload.single('video'), (req, res) => {
            if (!req.file)
                return res.status(400).send('No file uploaded');
            res.send({ message: 'File uploaded successfully', filename: req.file.filename });
        });
        this.app.get('/files', (req, res) => {
            const dir = path.join(process.cwd(), 'media');
            if (!fs.existsSync(dir))
                return res.json([]);
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4'));
            res.json(files);
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
        this.app.get('/', (req, res) => {
            const name = process.env.AGENT_NAME || 'VideoWall-Agent';
            const model = process.env.AGENT_MODEL || '4-screen';
            const layout = process.env.AGENT_LAYOUT || '2x2';
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>LedShow Agent Status</title>
                    <style>
                        body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; }
                        h1 { color: #fbbf24; margin-top: 0; }
                        .status { font-weight: bold; color: #22c55e; }
                        .info { margin: 1rem 0; color: #94a3b8; font-size: 0.9rem; }
                        button { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem; }
                        button:hover { background: #dc2626; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>VideoWall Agent</h1>
                        <p>Naam: <strong>${name}</strong></p>
                        <p>Status: <span class="status">ACTIEF</span></p>
                        <div class="info">
                            Model: ${model}<br>
                            Layout: ${layout}
                        </div>
                        <form action="/shutdown" method="POST">
                            <button type="submit">Agent Afsluiten</button>
                        </form>
                    </div>
                </body>
                </html>
            `);
        });
        this.app.get('/status', (req, res) => {
            res.send({ status: 'running', agent: 'LedShow VideoWall Agent' });
        });
        this.app.post('/shutdown', (req, res) => {
            res.send('Agent wordt afgesloten...');
            console.log('Shutdown request received via HTTP');
            setTimeout(() => process.exit(0), 1000);
        });
    }
    setupWebSockets() {
        this.wss.on('connection', (ws) => {
            console.log('Host connected via WebSocket');
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('Received command:', data);
                    switch (data.action) {
                        case 'play':
                            if (data.filename) {
                                await this.player.play(data.filename);
                            }
                            break;
                        case 'stop':
                            await this.player.stop();
                            break;
                        case 'volume':
                            if (typeof data.level === 'number') {
                                await this.player.setVolume(data.level);
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
    start(port = 3000) {
        this.server.on('error', (err) => {
            console.error('SERVER ERROR:', err);
        });
        this.server.listen(port, () => {
            console.log(`HTTP/WS Server listening on port ${port}`);
        });
    }
}
//# sourceMappingURL=server.js.map