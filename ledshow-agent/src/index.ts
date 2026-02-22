import { DiscoveryService } from './discovery.js';
import { PlayerService } from './player.js';
import { ServerService } from './server.js';
import { TrayService } from './tray.js';
import path from 'node:path';
import fs from 'node:fs';

const AGENT_PORT = parseInt(process.env.AGENT_PORT || '3000');
const AGENT_NAME = process.env.AGENT_NAME || undefined;

async function bootstrap() {
    try {
        console.log('--- LedShow VideoWall Agent Starting ---');

        // Ensure media directory exists
        const mediaDir = path.join(process.cwd(), 'media');
        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir);
        }

        // Initialize services
        const player = new PlayerService();
        await player.init();

        const discovery = new DiscoveryService(AGENT_NAME);
        const server = new ServerService(player);
        const tray = new TrayService(player);

        // Start services
        discovery.start();
        server.start(AGENT_PORT);
        await tray.start();

        console.log('--- Agent Ready ---');
    } catch (e) {
        console.error('CRITICAL STARTUP ERROR:', e);
        process.exit(1);
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
