import { DiscoveryService } from './discovery.js';
import { PlayerService } from './player.js';
import { ServerService } from './server.js';
import path from 'node:path';
import fs from 'node:fs';
import open from 'open';

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
            console.log('Attempting to launch Chromium-browser in kiosk mode...');
            await open(outputUrl, {
                app: { name: 'chromium-browser', arguments: ['--kiosk', '--disable-infobars', '--noerrdialogs', '--autoplay-policy=no-user-gesture-required'] }
            }).catch(async () => {
                await open(outputUrl);
            });
        }
    } catch (err) {
        console.error('Failed to open output browser:', err);
        console.log(`Please manually open: ${outputUrl}`);
    }

    // Also open the status dashboard
    const statusUrl = `http://localhost:${AGENT_PORT}`;
    console.log(`Status dashboard at ${statusUrl}`);
    try {
        await open(statusUrl);
    } catch (err) {
        // Not critical if this fails
    }

    console.log('--- Agent Ready ---');
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
