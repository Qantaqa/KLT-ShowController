import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mpv = require('node-mpv');

export class PlayerService {
    private mpvPlayer: any;
    private mediaPath: string;

    constructor() {
        this.mediaPath = path.join(process.cwd(), 'media');

        // Configuration for MPV
        // --fs: fullscreen
        // --ontop: always on top
        // --no-osc: no on-screen controller
        // --no-osd-bar: no progress bar
        this.mpvPlayer = new mpv({
            verbose: false,
            audio_only: false,
            auto_restart: true,
            binary: process.env.MPV_PATH || undefined // Allow custom path via env
        }, [
            '--fs',
            '--ontop',
            '--no-osc',
            '--no-osd-bar',
            '--idle=yes',
            '--background=black'
        ]);

        this.mpvPlayer.on('status', (status: any) => {
            // console.log('MPV Status:', status);
        });

        this.mpvPlayer.on('error', (err: any) => {
            console.error('MPV Error:', err);
        });
    }

    public async init() {
        if (!this.mpvPlayer) return;
        try {
            await this.mpvPlayer.start();
            console.log('MPV Player initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MPV:', error);
            console.warn('Is mpv installed and in your PATH? Or set MPV_PATH environment variable.');
        }
    }

    public async play(filename: string) {
        const fullPath = path.join(this.mediaPath, filename);
        console.log(`Playing: ${fullPath}`);
        try {
            await this.mpvPlayer.load(fullPath, 'replace');
            await this.mpvPlayer.play();
        } catch (error) {
            console.error(`Error playing ${filename}:`, error);
        }
    }

    public async stop() {
        try {
            await this.mpvPlayer.stop();
        } catch (error) {
            console.error('Error stopping player:', error);
        }
    }

    public async setVolume(level: number) {
        try {
            await this.mpvPlayer.volume(level);
        } catch (error) {
            console.error('Error setting volume:', error);
        }
    }
}

