import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mpv = require('node-mpv');
export class PlayerService {
    mpvPlayer;
    mediaPath;
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
        this.mpvPlayer.on('status', (status) => {
            // console.log('MPV Status:', status);
        });
        this.mpvPlayer.on('error', (err) => {
            console.error('MPV Error:', err);
        });
    }
    async init() {
        if (!this.mpvPlayer)
            return;
        try {
            await this.mpvPlayer.start();
            console.log('MPV Player initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize MPV:', error);
            console.warn('Is mpv installed and in your PATH? Or set MPV_PATH environment variable.');
        }
    }
    async play(filename) {
        const fullPath = path.join(this.mediaPath, filename);
        console.log(`Playing: ${fullPath}`);
        try {
            await this.mpvPlayer.load(fullPath, 'replace');
            await this.mpvPlayer.play();
        }
        catch (error) {
            console.error(`Error playing ${filename}:`, error);
        }
    }
    async stop() {
        try {
            await this.mpvPlayer.stop();
        }
        catch (error) {
            console.error('Error stopping player:', error);
        }
    }
    async setVolume(level) {
        try {
            await this.mpvPlayer.volume(level);
        }
        catch (error) {
            console.error('Error setting volume:', error);
        }
    }
}
//# sourceMappingURL=player.js.map